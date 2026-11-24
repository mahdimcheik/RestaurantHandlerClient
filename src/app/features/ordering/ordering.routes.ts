import { Routes } from '@angular/router';

const suffix = ' — Gestion';

/** Comptoir et commandes du jour, sous `/gestion`. */
export const ORDERING_ROUTES: Routes = [
  {
    path: 'comptoir',
    title: 'Comptoir' + suffix,
    loadComponent: () => import('./pages/counter-page/counter-page').then((m) => m.CounterPage),
  },
  {
    path: 'commandes',
    title: 'Commandes' + suffix,
    loadComponent: () => import('./pages/orders-page/orders-page').then((m) => m.OrdersPage),
  },
  {
    path: 'commandes/:id',
    title: 'Commande' + suffix,
    loadComponent: () => import('./pages/order-page/order-page').then((m) => m.OrderPage),
  },
];
