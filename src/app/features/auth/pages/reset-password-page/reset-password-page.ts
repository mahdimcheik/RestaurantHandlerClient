import { Component, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { form, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { AuthService } from '../../../../shared/services/auth.service';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import {
  focusFirstInvalid,
  newPasswordRules,
  PASSWORD_MIN_LENGTH,
  requiredRule,
} from '../../auth-validation';

const invalidLink = `Ce lien de réinitialisation n'est plus valide. Demandez-en un nouveau.`;

/** Ouverte depuis le lien de l'e-mail : `?userId=…&resetToken=…`. */
@Component({
  selector: 'app-reset-password-page',
  imports: [AuthLayout, TextField, RouterLink],
  template: `
    <app-auth-layout>
      <h1 class="display-title display-title--md">Nouveau mot de passe</h1>
      @if (hasLink()) {
        @if (error()) {
          <p class="alert alert--error" role="alert">{{ error() }}</p>
        }
        <form class="form" novalidate (submit)="onSubmit($event)">
          <app-text-field
            [field]="form.password"
            type="password"
            autocomplete="new-password"
            label="Nouveau mot de passe"
            [hint]="passwordHint"
          />
          <app-text-field
            [field]="form.passwordConfirmation"
            type="password"
            autocomplete="new-password"
            label="Confirmer le mot de passe"
          />
          <button
            type="submit"
            class="btn-brand btn-brand--solid form__submit"
            [disabled]="form().submitting()"
          >
            @if (form().submitting()) {
              Enregistrement…
            } @else {
              Enregistrer
            }
          </button>
        </form>
      } @else {
        <p class="alert alert--error" role="alert">{{ invalidLink }}</p>
      }
      @if (!hasLink() || linkRejected()) {
        <a class="btn-brand form__submit" routerLink="/auth/mot-de-passe-oublie">
          Demander un nouveau lien
        </a>
      }
    </app-auth-layout>
  `,
})
export class ResetPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly userId = input<string>();
  readonly resetToken = input<string>();

  protected readonly hasLink = computed(() => !!this.userId() && !!this.resetToken());
  protected readonly invalidLink = invalidLink;
  protected readonly passwordHint = `Au moins ${PASSWORD_MIN_LENGTH} caractères.`;

  private readonly model = signal({ password: '', passwordConfirmation: '' });
  protected readonly form = form(this.model, (path) => {
    newPasswordRules(path.password);
    requiredRule(path.passwordConfirmation);
    validate(path.passwordConfirmation, ({ value, valueOf }) =>
      value() && value() !== valueOf(path.password)
        ? {
            kind: 'mismatch',
            message: 'Les deux mots de passe ne correspondent pas.',
          }
        : undefined,
    );
  });
  protected readonly error = signal('');
  protected readonly linkRejected = signal(false);

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set('');
    await submit(this.form, {
      action: async () => {
        try {
          await firstValueFrom(
            this.auth.resetPassword({
              ...this.model(),
              userId: this.userId() ?? '',
              resetToken: this.resetToken() ?? '',
            }),
          );
          await this.router.navigate(['/auth/password-reset-success']);
        } catch (error) {
          const rejected =
            error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500;
          this.linkRejected.set(rejected);
          this.error.set(rejected ? invalidLink : apiErrorMessage(error));
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }
}
