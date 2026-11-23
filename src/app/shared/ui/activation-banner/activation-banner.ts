import { Component, inject, signal } from '@angular/core';
import { SessionService } from '../../../core/auth/session.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { AuthService } from '../../services/auth.service';

/** Bandeau tant que l'adresse e-mail du compte connecté n'est pas confirmée. */
@Component({
  selector: 'app-activation-banner',
  template: `
    @if (session.needsActivation()) {
      <div class="banner gutter">
        <p class="banner__text" i18n="@@activation.banner">
          Votre compte n'est pas encore activé : ouvrez le lien reçu par e-mail.
        </p>
        <button
          type="button"
          class="btn btn--outline"
          [disabled]="sending()"
          (click)="resend()"
          i18n="@@activation.resend"
        >
          Renvoyer le lien
        </button>
        <p class="banner__status" role="status">{{ status() }}</p>
      </div>
    }
  `,
})
export class ActivationBanner {
  protected readonly session = inject(SessionService);
  private readonly auth = inject(AuthService);
  protected readonly sending = signal(false);
  protected readonly status = signal('');

  protected resend(): void {
    this.sending.set(true);
    this.auth.resendMyConfirmation().subscribe({
      next: () => {
        this.sending.set(false);
        this.status.set(
          $localize`:@@activation.sent:Un nouveau lien d'activation vient de vous être envoyé.`,
        );
      },
      error: (error: unknown) => {
        this.sending.set(false);
        this.status.set(apiErrorMessage(error));
      },
    });
  }
}
