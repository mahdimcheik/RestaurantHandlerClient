import { Component, inject, input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../../core/auth/session.service';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';

/** Écran de confirmation (compte activé, mot de passe changé) ; textes fournis par la route. */
@Component({
  selector: 'app-result-page',
  imports: [AuthLayout, RouterLink],
  template: `
    <app-auth-layout>
      <h1 class="auth__title">{{ heading() }}</h1>
      <p class="alert alert--success" role="status">{{ message() }}</p>
      @if (session.isAuthenticated()) {
        <a class="btn form__submit" routerLink="/" i18n="@@auth.goHome">Retour à l'accueil</a>
      } @else {
        <a class="btn form__submit" routerLink="/auth/connexion" i18n="@@auth.goToLogin">
          Aller à la connexion
        </a>
      }
    </app-auth-layout>
  `,
})
export class ResultPage implements OnInit {
  protected readonly session = inject(SessionService);

  readonly heading = input.required<string>();
  readonly message = input.required<string>();
  /** Recharge le profil (compte tout juste activé) si l'utilisateur est déjà connecté. */
  readonly refreshSession = input(false);

  ngOnInit(): void {
    if (this.refreshSession() && this.session.isAuthenticated()) {
      this.session.refresh().subscribe({ error: () => undefined });
    }
  }
}
