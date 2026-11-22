// Télécharge le schéma OpenAPI de l'API locale dans openapi/swagger.json.
// Usage : npm run api:fetch   (API_URL=http://hote:port pour forcer l'adresse)
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SWAGGER_PATH = '/swagger/v1/swagger.json';
// Ports http des profils « http » et « https » de launchSettings.json.
const candidates = process.env.API_URL
  ? [process.env.API_URL]
  : ['http://localhost:5152', 'http://localhost:5113'];

const output = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'openapi', 'swagger.json');

for (const base of candidates) {
  const url = new URL(SWAGGER_PATH, base).toString();
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  } catch {
    continue;
  }
  if (!response.ok) {
    console.error(`${url} a répondu ${response.status} ${response.statusText}.`);
    process.exit(1);
  }
  const schema = await response.json();
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(schema, null, 2) + '\n');
  console.log(`Schéma OpenAPI récupéré depuis ${url} → openapi/swagger.json`);
  process.exit(0);
}

console.error(
  `API injoignable (${candidates.join(', ')}).\n` +
    'Lancer le backend : cd ../RestaurantHandlerAPI && dotnet run --project RestaurantHandler\n' +
    'ou préciser son adresse : API_URL=http://localhost:PORT npm run api:fetch',
);
process.exit(1);
