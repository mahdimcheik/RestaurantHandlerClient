import { Routes } from '@angular/router';

const suffix = $localize`:@@admin.titleSuffix: — Gestion`;

/** Comptoir et commandes du jour, sous `/gestion`. */
export const ORDERING_ROUTES: Routes = [
  {
    path: 'comptoir',
    title: $localize`:@@admin.counter:Comptoir` + suffix,
    loadComponent: () => import('./pages/counter-page/counter-page').then((m) => m.CounterPage),
  },
  {
    path: 'commandes',
    title: $localize`:@@admin.orders:Commandes` + suffix,
    loadComponent: () => import('./pages/orders-page/orders-page').then((m) => m.OrdersPage),
  },
  {
    path: 'commandes/:id',
    title: $localize`:@@order.pageTitle:Commande` + suffix,
    loadComponent: () => import('./pages/order-page/order-page').then((m) => m.OrderPage),
  },
];
