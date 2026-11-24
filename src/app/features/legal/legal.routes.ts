import { Routes } from '@angular/router';

const page = () => import('./legal-page').then((m) => m.LegalPage);

/**
 * Pages légales (conformité : CGV, confidentialité, mentions, allergènes). Chacune porte sa barre
 * du haut (`header: false`).
 */
export const LEGAL_ROUTES: Routes = [
  {
    path: 'cgv',
    data: { page: 'terms', header: false },
    title: 'Conditions générales de vente',
    loadComponent: page,
  },
  {
    path: 'confidentialite',
    data: { header: false },
    title: 'Politique de confidentialité',
    loadComponent: () => import('./pages/privacy-page/privacy-page').then((m) => m.PrivacyPage),
  },
  {
    path: 'mentions-legales',
    data: { header: false },
    title: 'Mentions légales',
    loadComponent: () => import('./pages/notice-page/notice-page').then((m) => m.NoticePage),
  },
  {
    path: 'allergenes',
    data: { page: 'allergens', header: false },
    title: 'Allergènes',
    loadComponent: page,
  },
];
