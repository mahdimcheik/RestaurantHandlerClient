import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Icon } from '../icon/icon';

type CopyState = 'idle' | 'copied' | 'failed';

const COPY_MESSAGE_MS = 3000;

/**
 * Partage d'une page du site : WhatsApp et Facebook par simples liens (aucun script tiers),
 * copie du lien et, si l'appareil le propose, sa feuille de partage. L'aperçu affiché par les
 * réseaux vient des balises Open Graph statiques de `index.html`, le même pour toutes les pages.
 */
@Component({
  selector: 'app-share-buttons',
  imports: [Icon],
  host: {
    class: 'share',
    role: 'group',
    '[attr.aria-labelledby]': 'heading() ? headingId : null',
  },
  template: `
    @if (heading(); as title) {
      <p [id]="headingId" class="share__title">{{ title }}</p>
    }
    <ul class="share__list">
      <li>
        <a
          class="btn-brand share__button"
          [href]="whatsappHref()"
          target="_blank"
          rel="noopener noreferrer"
        >
          <app-icon name="chat" />
          <span>WhatsApp</span>
          <span class="visually-hidden">(nouvel onglet)</span>
        </a>
      </li>
      <li>
        <a
          class="btn-brand share__button"
          [href]="facebookHref()"
          target="_blank"
          rel="noopener noreferrer"
        >
          <app-icon name="users" />
          <span>Facebook</span>
          <span class="visually-hidden">(nouvel onglet)</span>
        </a>
      </li>
      @if (canCopy) {
        <li>
          <button type="button" class="btn-brand share__button" (click)="copy()">
            <app-icon name="link" />
            <span>Copier le lien</span>
          </button>
        </li>
      }
      @if (canShare) {
        <li>
          <button type="button" class="btn-brand share__button" (click)="shareNatively()">
            <app-icon name="share" />
            <span>Plus d’options</span>
          </button>
        </li>
      }
    </ul>
    <p class="share__status" role="status">
      @switch (copyState()) {
        @case ('copied') {
          Lien copié
        }
        @case ('failed') {
          Copie impossible, copiez l’adresse depuis le navigateur
        }
      }
    </p>
  `,
})
export class ShareButtons {
  private static nextId = 0;

  /** Chemin du site à partager (`/carte`, `/commander/produit/…`). */
  readonly path = input('/');
  /** Message accompagnant le lien. */
  readonly text = input.required<string>();
  /** Titre visible du bloc ; sans titre, le bloc se fond dans son voisinage. */
  readonly heading = input<string>();

  protected readonly headingId = `share-title-${ShareButtons.nextId++}`;
  private readonly document = inject(DOCUMENT);
  private readonly navigator = this.document.defaultView?.navigator;
  protected readonly canCopy = !!this.navigator?.clipboard;
  protected readonly canShare = typeof this.navigator?.share === 'function';
  protected readonly copyState = signal<CopyState>('idle');
  private resetTimer: ReturnType<typeof setTimeout> | undefined;

  readonly url = computed(() => new URL(this.path(), this.document.baseURI).href);
  protected readonly whatsappHref = computed(
    () => `https://wa.me/?text=${encodeURIComponent(`${this.text()} ${this.url()}`)}`,
  );
  protected readonly facebookHref = computed(
    () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.url())}`,
  );

  protected async copy(): Promise<void> {
    try {
      await this.navigator!.clipboard.writeText(this.url());
      this.showCopyState('copied');
    } catch {
      this.showCopyState('failed');
    }
  }

  protected async shareNatively(): Promise<void> {
    try {
      await this.navigator!.share({
        title: this.document.title,
        text: this.text(),
        url: this.url(),
      });
    } catch {
      // Feuille de partage refermée ou refusée : rien à signaler.
    }
  }

  private showCopyState(state: CopyState): void {
    this.copyState.set(state);
    clearTimeout(this.resetTimer);
    this.resetTimer = setTimeout(() => this.copyState.set('idle'), COPY_MESSAGE_MS);
  }
}
