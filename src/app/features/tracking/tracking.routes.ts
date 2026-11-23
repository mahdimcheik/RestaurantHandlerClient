import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guards';

/**
 * Suivi client (E08). `commandes/:id` est l'adresse de retour du paiement SumUp
 * (`{API_FRONT_URL}/commandes/{id}`) : ne pas la renommer.
 */
export const TRACKING_ROUTES: Routes = [
  {
    path: 'commandes/:id',
    canActivate: [authGuard],
    title: $localize`:@@tracking.title:Suivi de commande`,
    loadComponent: () => import('./pages/tracking-page/tracking-page').then((m) => m.TrackingPage),
  },
];
