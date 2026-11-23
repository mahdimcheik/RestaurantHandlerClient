import { Routes } from '@angular/router';

const suffix = $localize`:@@admin.titleSuffix: — Gestion`;

/** Comptes utilisateurs (US-E10-1 à 4), sous `/gestion`. */
export const STAFF_ROUTES: Routes = [
  {
    path: 'utilisateurs',
    title: $localize`:@@admin.users:Utilisateurs` + suffix,
    loadComponent: () =>
      import('./pages/user-list-page/user-list-page').then((m) => m.UserListPage),
  },
  {
    path: 'utilisateurs/nouveau',
    title: $localize`:@@user.newManager:Nouveau compte Manager` + suffix,
    loadComponent: () =>
      import('./pages/user-create-page/user-create-page').then((m) => m.UserCreatePage),
  },
  {
    path: 'utilisateurs/:id',
    title: $localize`:@@user.pageTitle:Utilisateur` + suffix,
    loadComponent: () => import('./pages/user-page/user-page').then((m) => m.UserPage),
  },
];
