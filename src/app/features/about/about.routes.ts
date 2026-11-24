import { Routes } from '@angular/router';

/** Présentation du restaurant et de son cuisinier. Porte sa propre barre du haut. */
export const ABOUT_ROUTES: Routes = [
  {
    path: 'a-propos',
    title: 'À propos',
    data: { header: false },
    loadComponent: () => import('./pages/about-page/about-page').then((m) => m.AboutPage),
  },
];
