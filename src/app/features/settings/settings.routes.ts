import { Routes } from '@angular/router';

const suffix = ' — Gestion';

/** Service du jour et réglages du restaurant, sous `/gestion`. */
export const SETTINGS_ROUTES: Routes = [
  {
    path: 'ruptures',
    title: 'Ruptures' + suffix,
    loadComponent: () => import('./pages/stock-page/stock-page').then((m) => m.StockPage),
  },
  {
    path: 'ouverture',
    title: 'Horaires et fermetures' + suffix,
    loadComponent: () => import('./pages/opening-page/opening-page').then((m) => m.OpeningPage),
  },
  {
    path: 'restaurant',
    title: 'Restaurant' + suffix,
    loadComponent: () =>
      import('./pages/restaurant-page/restaurant-page').then((m) => m.RestaurantPage),
  },
];
