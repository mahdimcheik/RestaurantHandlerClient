import { Component, inject, input, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { safeReturnUrl } from '../../../../core/auth/return-url';
import { SessionService } from '../../../../core/auth/session.service';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { emailRules, focusFirstInvalid, requiredRule } from '../../auth-validation';
import { GoogleSignIn } from '../../components/google-sign-in';

@Component({
  selector: 'app-login-page',
  imports: [AuthLayout, TextField, GoogleSignIn, RouterLink],
  templateUrl: './login-page.html',
})
export class LoginPage {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  /** Page à rouvrir après la connexion (paramètre `returnUrl`). */
  readonly returnUrl = input<string>();

  private readonly model = signal({ email: '', password: '' });
  protected readonly form = form(this.model, (path) => {
    emailRules(path.email);
    requiredRule(path.password);
  });
  protected readonly error = signal('');

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set('');
    await submit(this.form, {
      action: async () => {
        try {
          await firstValueFrom(this.session.login(this.model()));
          await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
        } catch (error) {
          this.error.set(apiErrorMessage(error));
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }

  protected onGoogle(idToken: string): void {
    this.error.set('');
    this.session.loginWithGoogle({ idToken }).subscribe({
      next: () => void this.router.navigateByUrl(safeReturnUrl(this.returnUrl())),
      error: (error: unknown) => this.error.set(apiErrorMessage(error)),
    });
  }
}
