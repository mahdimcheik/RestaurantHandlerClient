import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { AuthService } from '../../../../shared/services/auth.service';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';

/** L'API redirige ici quand le lien d'activation est expiré ou invalide (`?userId=…`). */
@Component({
  selector: 'app-activation-failed-page',
  imports: [AuthLayout, RouterLink],
  template: `
    <app-auth-layout>
      <h1 class="auth__title">Lien expiré</h1>
      <p class="auth__lead">Ce lien d'activation n'est plus valide.</p>
      @if (message()) {
        <p
          class="alert"
          [class.alert--error]="failed()"
          [class.alert--success]="!failed()"
          role="status"
        >
          {{ message() }}
        </p>
      }
      @if (userId() && !sent()) {
        <button type="button" class="btn form__submit" [disabled]="sending()" (click)="resend()">
          @if (sending()) {
            Envoi…
          } @else {
            Recevoir un nouveau lien
          }
        </button>
      }
      <a class="form__link" routerLink="/auth/connexion"> Retour à la connexion </a>
    </app-auth-layout>
  `,
})
export class ActivationFailedPage {
  private readonly auth = inject(AuthService);

  readonly userId = input<string>();

  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly failed = signal(false);
  protected readonly message = signal('');

  protected resend(): void {
    const userId = this.userId();
    if (!userId) {
      return;
    }
    this.sending.set(true);
    this.auth.resendConfirmation({ userId }).subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.set(true);
        this.failed.set(false);
        this.message.set(
          'Si ce compte attend une activation, un nouveau lien vient de vous être envoyé.',
        );
      },
      error: (error: unknown) => {
        this.sending.set(false);
        this.failed.set(true);
        this.message.set(apiErrorMessage(error));
      },
    });
  }
}
