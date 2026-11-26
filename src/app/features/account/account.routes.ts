import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guards';

/** Compte client : profil professionnel (factures électroniques, US-E05-6). */
export const ACCOUNT_ROUTES: Routes = [
  {
    path: 'compte/professionnel',
    canActivate: [authGuard],
    title: 'Compte professionnel',
    loadComponent: () =>
      import('./pages/business-profile-page/business-profile-page').then(
        (m) => m.BusinessProfilePage,
      ),
  },
];
