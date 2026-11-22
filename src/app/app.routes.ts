import { Routes } from '@angular/router';
import { managerGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./features/home/home.routes').then((m) => m.HOME_ROUTES),
  },
  {
    path: 'auth',
    data: { bare: true },
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'gestion',
    loadComponent: () => import('./shared/ui/admin-layout/admin-layout').then((m) => m.AdminLayout),
    canActivate: [managerGuard],
    data: { bare: true },
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: '',
        loadChildren: () =>
          import('./features/menu-admin/menu-admin.routes').then((m) => m.MENU_ADMIN_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
