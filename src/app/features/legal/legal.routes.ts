import { Routes } from '@angular/router';

const page = () => import('./legal-page').then((m) => m.LegalPage);

/** Pages légales (conformité : CGV, confidentialité, mentions, allergènes). */
export const LEGAL_ROUTES: Routes = [
  {
    path: 'cgv',
    data: { page: 'terms' },
    title: 'Conditions générales de vente',
    loadComponent: page,
  },
  {
    path: 'confidentialite',
    data: { page: 'privacy' },
    title: 'Politique de confidentialité',
    loadComponent: page,
  },
  {
    path: 'mentions-legales',
    data: { page: 'notice' },
    title: 'Mentions légales',
    loadComponent: page,
  },
  {
    path: 'allergenes',
    data: { page: 'allergens' },
    title: 'Allergènes',
    loadComponent: page,
  },
];
