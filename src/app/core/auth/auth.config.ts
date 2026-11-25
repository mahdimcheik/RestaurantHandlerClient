import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Identifiant client OAuth « application web » de Google (valeur publique, même valeur que
 * `GOOGLE_CLIENT_ID` côté API), lu dans `src/environments/`. Vide : le bouton « Continuer avec
 * Google » est masqué.
 */
export const GOOGLE_CLIENT_ID = new InjectionToken<string>('GOOGLE_CLIENT_ID', {
  factory: () => environment.GOOGLE_CLIENT_ID,
});
