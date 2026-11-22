import { HttpErrorResponse } from '@angular/common/http';

/**
 * Message à afficher pour une erreur d'appel à l'API : le `message` de l'enveloppe
 * `{ message, status }` du serveur (déjà rédigé pour l'usager), sinon un texte générique.
 */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return $localize`:@@error.network:Le serveur est injoignable. Vérifiez votre connexion et réessayez.`;
    }
    const body: unknown = error.error;
    if (
      error.status < 500 &&
      body &&
      typeof body === 'object' &&
      'message' in body &&
      typeof body.message === 'string'
    ) {
      return body.message;
    }
  }
  return $localize`:@@error.generic:Une erreur est survenue. Réessayez dans un instant.`;
}
