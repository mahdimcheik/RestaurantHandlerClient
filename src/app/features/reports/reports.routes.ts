import { Routes } from '@angular/router';

const suffix = $localize`:@@admin.titleSuffix: — Gestion`;

/** Statistiques de pilotage, sous `/gestion`. */
export const REPORTS_ROUTES: Routes = [
  {
    path: 'statistiques',
    title: $localize`:@@admin.stats:Statistiques` + suffix,
    loadComponent: () => import('./pages/stats-page/stats-page').then((m) => m.StatsPage),
  },
];
