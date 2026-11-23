import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage, cartIssues } from './api-error';

const problem = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

describe('api-error', () => {
  it('lit les lignes refusées d’un panier (409)', () => {
    const error = problem(409, {
      message: 'Votre panier doit être mis à jour : Rupture.',
      issues: [{ lineIndex: 1, message: 'Rupture' }, { lineIndex: 'x' }],
    });
    expect(cartIssues(error)).toEqual([{ lineIndex: 1, message: 'Rupture' }]);
    expect(apiErrorMessage(error)).toContain('panier');
  });

  it('ne trouve aucune ligne dans une autre erreur', () => {
    expect(cartIssues(problem(409, { message: 'Créneau plein' }))).toEqual([]);
    expect(cartIssues(problem(400, { issues: [{ lineIndex: 0, message: 'x' }] }))).toEqual([]);
    expect(cartIssues(new Error('x'))).toEqual([]);
  });
});
