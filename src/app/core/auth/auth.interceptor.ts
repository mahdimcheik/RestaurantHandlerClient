import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { SessionService } from './session.service';

const withToken = (request: HttpRequest<unknown>, token: string) =>
  request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

/**
 * Ajoute le jeton d'accès aux appels de l'API. Sur un 401 d'une requête authentifiée,
 * renouvelle le jeton une fois puis rejoue ; sinon renvoie vers l'écran de connexion.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionService);
  const router = inject(Router);
  const token = session.accessToken();

  // Le renouvellement passe par le cookie : ni jeton, ni nouvel essai (il s'attendrait lui-même).
  if (!token || !request.url.startsWith('/api/') || request.url.endsWith('/auth/refresh-token')) {
    return next(request);
  }

  return next(withToken(request, token)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return session.refresh().pipe(
        catchError(() => {
          session.clear();
          void router.navigate(['/auth/connexion'], {
            queryParams: { returnUrl: router.url },
          });
          return throwError(() => error);
        }),
        switchMap((renewed) => next(withToken(request, renewed))),
      );
    }),
  );
};
