import { Routes } from '@angular/router';
import { managerGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./features/home/home.routes').then((m) => m.HOME_ROUTES),
  },
  {
    path: '',
    loadChildren: () => import('./features/shop/shop.routes').then((m) => m.SHOP_ROUTES),
  },
  {
    path: '',
    loadChildren: () =>
      import('./features/tracking/tracking.routes').then((m) => m.TRACKING_ROUTES),
  },
  {
    path: '',
    loadChildren: () => import('./features/legal/legal.routes').then((m) => m.LEGAL_ROUTES),
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
      {
        path: '',
        loadChildren: () =>
          import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
      {
        path: '',
        loadChildren: () =>
          import('./features/ordering/ordering.routes').then((m) => m.ORDERING_ROUTES),
      },
      {
        path: '',
        loadChildren: () =>
          import('./features/reports/reports.routes').then((m) => m.REPORTS_ROUTES),
      },
      {
        path: '',
        loadChildren: () => import('./features/staff/staff.routes').then((m) => m.STAFF_ROUTES),
      },
    ],
  },
  {
    path: 'cuisine',
    canActivate: [managerGuard],
    data: { bare: true },
    loadChildren: () => import('./features/kitchen/kitchen.routes').then((m) => m.KITCHEN_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
