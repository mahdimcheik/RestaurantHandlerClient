import { Routes } from '@angular/router';

const suffix = ' — Service';

/** Commandes du jour, sous `/service`. */
export const ORDERING_ROUTES: Routes = [
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
