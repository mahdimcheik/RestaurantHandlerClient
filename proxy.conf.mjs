// Proxy du serveur de dev : SPA et API sur la même origine (cookies, XSRF, pas de CORS).
// Cible : variable API_URL, sinon le port http du profil « https » de l'API (launchSettings.json).
const target = process.env.API_URL ?? 'http://localhost:5113';

export default {
  '/api': {
    target,
    secure: false,
    pathRewrite: { '^/api': '' },
  },
  '/hubs': {
    target,
    secure: false,
    ws: true,
  },
};
