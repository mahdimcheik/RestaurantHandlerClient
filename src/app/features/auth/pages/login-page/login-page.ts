import { Component, inject, input, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { safeReturnUrl } from '../../../../core/auth/return-url';
import { SessionService } from '../../../../core/auth/session.service';
import { apiErrorMessage, apiErrorStatus } from '../../../../core/http/api-error';
import { AuthLayout } from '../../../../shared/ui/auth-layout/auth-layout';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { emailRules, focusFirstInvalid, requiredRule } from '../../auth-validation';
import { GoogleConsentNotice } from '../../components/google-consent-notice';
import { GoogleSignIn } from '../../components/google-sign-in';

/** Statut renvoyé par `POST /auth/google` pour un compte Google inconnu (`HardCode` côté API). */
const GOOGLE_CONSENT_REQUIRED = 428;

/** Compte Google sans compte associé, en attente de l'acceptation des conditions. */
interface PendingGoogle {
  idToken: string;
  email: string;
}

@Component({
  selector: 'app-login-page',
  imports: [AuthLayout, TextField, GoogleSignIn, GoogleConsentNotice, RouterLink],
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
  protected readonly pendingGoogle = signal<PendingGoogle | null>(null);
  protected readonly creating = signal(false);

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

  /** Compte Google inconnu : on propose de le créer ici plutôt que d'afficher une erreur. */
  protected onGoogle(idToken: string): void {
    this.error.set('');
    this.session.loginWithGoogle({ idToken }).subscribe({
      next: () => void this.router.navigateByUrl(safeReturnUrl(this.returnUrl())),
      error: (error: unknown) => {
        if (apiErrorStatus(error) === GOOGLE_CONSENT_REQUIRED) {
          this.pendingGoogle.set({ idToken, email: googleEmail(idToken) });
        } else {
          this.error.set(apiErrorMessage(error));
        }
      },
    });
  }

  /** Le bouton « Créer mon compte » vaut acceptation de la mention affichée au-dessus. */
  protected createGoogleAccount(): void {
    const pending = this.pendingGoogle();
    if (!pending || this.creating()) return;
    this.error.set('');
    this.creating.set(true);
    this.session
      .loginWithGoogle({
        idToken: pending.idToken,
        termsConsent: true,
        privacyPolicyConsent: true,
        dataProcessingConsent: true,
      })
      .subscribe({
        next: () => void this.router.navigateByUrl(safeReturnUrl(this.returnUrl())),
        error: (error: unknown) => {
          // Jeton expiré ou refusé : le client repasse par le bouton Google.
          this.creating.set(false);
          this.pendingGoogle.set(null);
          this.error.set(apiErrorMessage(error));
        },
      });
  }

  protected cancelGoogle(): void {
    this.pendingGoogle.set(null);
    this.error.set('');
  }
}

/** E-mail lu dans le payload de l'ID token, pour l'affichage seulement (l'API le vérifie). */
function googleEmail(idToken: string): string {
  try {
    const payload = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0));
    const email: unknown = JSON.parse(new TextDecoder().decode(bytes)).email;
    return typeof email === 'string' ? email : '';
  } catch {
    return '';
  }
}
