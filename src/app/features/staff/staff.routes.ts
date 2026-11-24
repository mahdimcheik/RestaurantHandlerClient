import { Routes } from '@angular/router';

const suffix = ' — Gestion';

/** Comptes utilisateurs (US-E10-1 à 4), sous `/gestion`. */
export const STAFF_ROUTES: Routes = [
  {
    path: 'utilisateurs',
    title: 'Utilisateurs' + suffix,
    loadComponent: () =>
      import('./pages/user-list-page/user-list-page').then((m) => m.UserListPage),
  },
  {
    path: 'utilisateurs/nouveau',
    title: 'Nouveau compte Manager' + suffix,
    loadComponent: () =>
      import('./pages/user-create-page/user-create-page').then((m) => m.UserCreatePage),
  },
  {
    path: 'utilisateurs/:id',
    title: 'Utilisateur' + suffix,
    loadComponent: () => import('./pages/user-page/user-page').then((m) => m.UserPage),
  },
];
