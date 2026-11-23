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
    title: $localize`:@@login.pageTitle:Connexion`,
    loadComponent: () => import('./pages/login-page/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'inscription',
    canActivate: [guestGuard],
    title: $localize`:@@register.pageTitle:Créer un compte`,
    loadComponent: () => import('./pages/register-page/register-page').then((m) => m.RegisterPage),
  },
  {
    path: 'mot-de-passe-oublie',
    canActivate: [guestGuard],
    title: $localize`:@@forgot.pageTitle:Mot de passe oublié`,
    loadComponent: () =>
      import('./pages/forgot-password-page/forgot-password-page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    title: $localize`:@@reset.pageTitle:Nouveau mot de passe`,
    loadComponent: () =>
      import('./pages/reset-password-page/reset-password-page').then((m) => m.ResetPasswordPage),
  },
  {
    path: 'password-reset-success',
    title: $localize`:@@resetDone.pageTitle:Mot de passe modifié`,
    data: {
      heading: $localize`:@@resetDone.heading:Mot de passe modifié`,
      message: $localize`:@@resetDone.message:Votre mot de passe a été changé. Connectez-vous avec le nouveau.`,
    },
    loadComponent: () => import('./pages/result-page/result-page').then((m) => m.ResultPage),
  },
  {
    path: 'email-confirmation-success',
    title: $localize`:@@activated.pageTitle:Compte activé`,
    data: {
      heading: $localize`:@@activated.heading:Compte activé`,
      message: $localize`:@@activated.message:Votre adresse e-mail est confirmée : votre compte est prêt.`,
      refreshSession: true,
    },
    loadComponent: () => import('./pages/result-page/result-page').then((m) => m.ResultPage),
  },
  {
    path: 'email-confirmation-failed',
    title: $localize`:@@activationFailed.pageTitle:Lien d'activation expiré`,
    loadComponent: () =>
      import('./pages/activation-failed-page/activation-failed-page').then(
        (m) => m.ActivationFailedPage,
      ),
  },
];
