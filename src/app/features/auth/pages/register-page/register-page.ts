import { Component, inject, input, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { safeReturnUrl } from '../../../../core/auth/return-url';
import { SessionService } from '../../../../core/auth/session.service';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { AuthService } from '../../../../shared/services/auth.service';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';
import { CheckboxField } from '../../../../shared/ui/checkbox-field/checkbox-field';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import {
  emailRules,
  focusFirstInvalid,
  mustBeChecked,
  nameRules,
  newPasswordRules,
  PASSWORD_MIN_LENGTH,
} from '../../auth-validation';
import { GoogleConsentNotice } from '../../components/google-consent-notice';
import { GoogleSignIn } from '../../components/google-sign-in';

@Component({
  selector: 'app-register-page',
  imports: [AuthLayout, TextField, CheckboxField, GoogleSignIn, GoogleConsentNotice, RouterLink],
  templateUrl: './register-page.html',
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  readonly returnUrl = input<string>();

  private readonly model = signal({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    termsConsent: false,
    privacyPolicyConsent: false,
    dataProcessingConsent: false,
  });
  protected readonly form = form(this.model, (path) => {
    nameRules(path.firstName);
    nameRules(path.lastName);
    emailRules(path.email);
    newPasswordRules(path.password);
    mustBeChecked(
      path.termsConsent,
      `Acceptez les conditions générales d'utilisation pour créer un compte.`,
    );
    mustBeChecked(
      path.privacyPolicyConsent,
      'Acceptez la politique de confidentialité pour créer un compte.',
    );
    mustBeChecked(
      path.dataProcessingConsent,
      'Acceptez le traitement de vos données pour créer un compte.',
    );
  });

  protected readonly passwordHint = `Au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  protected readonly error = signal('');
  /** Adresse à laquelle le lien d'activation a été envoyé, une fois le compte créé. */
  protected readonly registeredEmail = signal<string | null>(null);

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set('');
    await submit(this.form, {
      action: async () => {
        const value = this.model();
        try {
          await firstValueFrom(this.auth.register(value));
          this.registeredEmail.set(value.email);
        } catch (error) {
          this.error.set(apiErrorMessage(error));
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }

  /**
   * Un premier login Google crée le compte : la mention affichée sous le bouton vaut
   * acceptation, d'où les trois consentements envoyés à `true` sans case à cocher.
   */
  protected onGoogle(idToken: string): void {
    this.error.set('');
    this.session
      .loginWithGoogle({
        idToken,
        termsConsent: true,
        privacyPolicyConsent: true,
        dataProcessingConsent: true,
      })
      .subscribe({
        next: () => void this.router.navigateByUrl(safeReturnUrl(this.returnUrl())),
        error: (error: unknown) => this.error.set(apiErrorMessage(error)),
      });
  }
}
