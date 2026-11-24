import { HttpErrorResponse } from '@angular/common/http';
import { CartIssueDto } from '../api/generated';

/**
 * Message à afficher pour une erreur d'appel à l'API : le `message` de l'enveloppe
 * `{ message, status }` du serveur (déjà rédigé pour l'usager), sinon un texte générique.
 */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Le serveur est injoignable. Vérifiez votre connexion et réessayez.';
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
  return 'Une erreur est survenue. Réessayez dans un instant.';
}

/**
 * Lignes refusées d'un panier (409 `CartProblemDetails` de `POST /orders/quote` et `POST /orders`) ;
 * `lineIndex` -1 vise le panier entier. Tableau vide pour toute autre erreur.
 */
export function cartIssues(error: unknown): CartIssueDto[] {
  if (!(error instanceof HttpErrorResponse) || error.status !== 409) return [];
  const body: unknown = error.error;
  if (!body || typeof body !== 'object' || !('issues' in body) || !Array.isArray(body.issues)) {
    return [];
  }
  return body.issues.filter(
    (issue: unknown): issue is CartIssueDto =>
      !!issue &&
      typeof issue === 'object' &&
      'lineIndex' in issue &&
      typeof issue.lineIndex === 'number' &&
      'message' in issue &&
      typeof issue.message === 'string',
  );
}
