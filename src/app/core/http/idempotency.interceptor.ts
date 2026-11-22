import { HttpInterceptorFn } from '@angular/common/http';

const MODIFYING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Ajoute un `Idempotency-Key` aux écritures vers l'API qui n'en portent pas déjà. Placé avant
 * l'intercepteur d'authentification : le nouvel essai après un 401 rejoue la même requête, donc
 * la même clé. Un appelant qui relance lui-même une action fournit sa propre clé.
 */
export const idempotencyInterceptor: HttpInterceptorFn = (request, next) => {
  if (
    !MODIFYING.has(request.method) ||
    !request.url.startsWith('/api/') ||
    request.headers.has('Idempotency-Key')
  ) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { 'Idempotency-Key': crypto.randomUUID() } }));
};
