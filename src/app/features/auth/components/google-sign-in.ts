import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { GoogleIdentityService } from '../../../core/auth/google-identity.service';

/**
 * Bouton officiel « Continuer avec Google » ; émet l'ID token reçu de Google. Le contenu
 * projeté (mention légale) s'affiche sous le bouton, et seulement si Google est configuré.
 */
@Component({
  selector: 'app-google-sign-in',
  host: { class: 'google-sign-in' },
  template: `
    @if (google.enabled) {
      @if (divider() === 'before') {
        <p class="divider">ou</p>
      }
      <div #button class="google-button"></div>
      @if (unavailable()) {
        <p class="field__hint">La connexion avec Google est indisponible pour le moment.</p>
      }
      <ng-content />
      @if (divider() === 'after') {
        <p class="divider">ou</p>
      }
    }
  `,
})
export class GoogleSignIn {
  protected readonly google = inject(GoogleIdentityService);
  private readonly button = viewChild<ElementRef<HTMLElement>>('button');

  /** Place du séparateur « ou » : avant le bouton (sous un formulaire) ou après (en tête). */
  readonly divider = input<'before' | 'after'>('before');
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
