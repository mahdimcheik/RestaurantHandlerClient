import { Login } from '../api/generated';

/** Réponse de l'API pour les tests. */
export const envelope = <T>(data: T) => ({ data, message: 'OK', status: 200 });

/** Session de test renvoyée par login / refresh-token. */
export const loginData = (token = 'jwt-1', emailConfirmed = true): Login => ({
  token,
  refreshToken: 'refresh',
  user: { id: 'u1', email: 'a@b.fr', firstName: 'Ana', lastName: 'B', roles: [], emailConfirmed },
});
