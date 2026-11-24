import { Routes } from '@angular/router';
import { guestGuard } from '../../core/auth/auth.guards';

/**
 * Écrans d'authentification. Les chemins anglais sont imposés par les liens des e-mails
 * de l'API (`reset-password`, `email-confirmation-*`, `password-reset-success`).
 */
export const AUTH_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'connexion' },
  {
    path: 'connexion',
    canActivate: [guestGuard],
    title: 'Connexion',
    loadComponent: () => import('./pages/login-page/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'inscription',
    canActivate: [guestGuard],
    title: 'Créer un compte',
    loadComponent: () => import('./pages/register-page/register-page').then((m) => m.RegisterPage),
  },
  {
    path: 'mot-de-passe-oublie',
    canActivate: [guestGuard],
    title: 'Mot de passe oublié',
    loadComponent: () =>
      import('./pages/forgot-password-page/forgot-password-page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    title: 'Nouveau mot de passe',
    loadComponent: () =>
      import('./pages/reset-password-page/reset-password-page').then((m) => m.ResetPasswordPage),
  },
  {
    path: 'password-reset-success',
    title: 'Mot de passe modifié',
    data: {
      heading: 'Mot de passe modifié',
      message: 'Votre mot de passe a été changé. Connectez-vous avec le nouveau.',
    },
    loadComponent: () => import('./pages/result-page/result-page').then((m) => m.ResultPage),
  },
  {
    path: 'email-confirmation-success',
    title: 'Compte activé',
    data: {
      heading: 'Compte activé',
      message: 'Votre adresse e-mail est confirmée : votre compte est prêt.',
      refreshSession: true,
    },
    loadComponent: () => import('./pages/result-page/result-page').then((m) => m.ResultPage),
  },
  {
    path: 'email-confirmation-failed',
    title: `Lien d'activation expiré`,
    loadComponent: () =>
      import('./pages/activation-failed-page/activation-failed-page').then(
        (m) => m.ActivationFailedPage,
      ),
  },
];
