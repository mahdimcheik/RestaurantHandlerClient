import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

/** Réservé aux utilisateurs connectés ; sinon connexion, puis retour à la page demandée. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(SessionService).isAuthenticated()) {
    return true;
  }
  return inject(Router).createUrlTree(['/auth/connexion'], {
    queryParams: { returnUrl: state.url },
  });
};

/** Pages de connexion et d'inscription : inutiles une fois connecté. */
export const guestGuard: CanActivateFn = () =>
  inject(SessionService).isAuthenticated() ? inject(Router).createUrlTree(['/']) : true;

/** Back-office : connexion d'abord, puis rôle Manager (sinon retour à l'accueil). */
export const managerGuard: CanActivateFn = (route, state) => {
  const session = inject(SessionService);
  if (!session.isAuthenticated()) {
    return authGuard(route, state);
  }
  return session.isManager() ? true : inject(Router).createUrlTree(['/']);
};
