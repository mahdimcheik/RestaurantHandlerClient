import { Component, inject, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { AuthService } from '../../../../shared/services/auth.service';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { emailRules, focusFirstInvalid } from '../../auth-validation';

@Component({
  selector: 'app-forgot-password-page',
  imports: [AuthLayout, TextField, RouterLink],
  template: `
    <app-auth-layout>
      <h1 class="display-title display-title--md">Mot de passe oublié</h1>
      @if (sent()) {
        <p class="alert alert--success" role="status">
          Si un compte correspond à cette adresse, un e-mail de réinitialisation vient d'y être
          envoyé.
        </p>
        <a class="btn-brand btn-brand--solid form__submit" routerLink="/auth/connexion">
          Retour à la connexion
        </a>
      } @else {
        <p class="auth__lead">
          Saisissez l'adresse de votre compte : vous recevrez un lien pour choisir un nouveau mot de
          passe.
        </p>
        @if (error()) {
          <p class="alert alert--error" role="alert">{{ error() }}</p>
        }
        <form class="form" novalidate (submit)="onSubmit($event)">
          <app-text-field [field]="form.email" type="email" autocomplete="email" label="E-mail" />
          <button
            type="submit"
            class="btn-brand btn-brand--solid form__submit"
            [disabled]="form().submitting()"
          >
            @if (form().submitting()) {
              Envoi…
            } @else {
              Recevoir le lien
            }
          </button>
          <a class="form__link" routerLink="/auth/connexion"> Retour à la connexion </a>
        </form>
      }
    </app-auth-layout>
  `,
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);

  private readonly model = signal({ email: '' });
  protected readonly form = form(this.model, (path) => emailRules(path.email));
  protected readonly error = signal('');
  protected readonly sent = signal(false);

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set('');
    await submit(this.form, {
      action: async () => {
        try {
          await firstValueFrom(this.auth.forgotPassword(this.model()));
          this.sent.set(true);
        } catch (error) {
          this.error.set(apiErrorMessage(error));
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }
}
