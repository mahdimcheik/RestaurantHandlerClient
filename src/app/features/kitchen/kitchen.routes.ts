import { Routes } from '@angular/router';

/** Écran cuisine plein écran (KDS), sous `/cuisine`. */
export const KITCHEN_ROUTES: Routes = [
  {
    path: '',
    title: $localize`:@@kitchen.pageTitle:Cuisine`,
    loadComponent: () => import('./pages/kitchen-page/kitchen-page').then((m) => m.KitchenPage),
  },
];
