import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { GoogleIdentityService } from '../../../core/auth/google-identity.service';

/** Bouton officiel « Continuer avec Google » ; émet l'ID token reçu de Google. */
@Component({
  selector: 'app-google-sign-in',
  template: `
    @if (google.enabled) {
      <p class="divider" i18n="@@auth.or">ou</p>
      <div #button class="google-button"></div>
      @if (unavailable()) {
        <p class="field__hint" i18n="@@auth.googleUnavailable">
          La connexion avec Google est indisponible pour le moment.
        </p>
      }
    }
  `,
})
export class GoogleSignIn {
  protected readonly google = inject(GoogleIdentityService);
  private readonly button = viewChild<ElementRef<HTMLElement>>('button');

  readonly credential = output<string>();
  protected readonly unavailable = signal(false);

  constructor() {
    afterNextRender(() => {
      const element = this.button()?.nativeElement;
      if (element) {
        this.google
          .renderButton(element, (idToken) => this.credential.emit(idToken))
          .catch(() => this.unavailable.set(true));
      }
    });
  }
}
