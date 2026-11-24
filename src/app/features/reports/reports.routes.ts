import { Routes } from '@angular/router';

const suffix = ' — Gestion';

/** Statistiques de pilotage, sous `/gestion`. */
export const REPORTS_ROUTES: Routes = [
  {
    path: 'statistiques',
    title: 'Statistiques' + suffix,
    loadComponent: () => import('./pages/stats-page/stats-page').then((m) => m.StatsPage),
  },
];
