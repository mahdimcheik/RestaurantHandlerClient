import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guards';

/**
 * Suivi client (E08). `commandes/:id` est l'adresse de retour du paiement SumUp
 * (`{API_FRONT_URL}/commandes/{id}`) : ne pas la renommer.
 */
export const TRACKING_ROUTES: Routes = [
  {
    path: 'commandes',
    canActivate: [authGuard],
    title: 'Mes commandes',
    loadComponent: () => import('./pages/history-page/history-page').then((m) => m.HistoryPage),
  },
  {
    path: 'commandes/:id',
    canActivate: [authGuard],
    title: 'Suivi de commande',
    loadComponent: () => import('./pages/tracking-page/tracking-page').then((m) => m.TrackingPage),
  },
  {
    path: 'commandes/:id/recu',
    canActivate: [authGuard],
    title: 'Reçu',
    loadComponent: () => import('./pages/receipt-page/receipt-page').then((m) => m.ReceiptPage),
  },
];
