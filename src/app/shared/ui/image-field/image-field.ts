import { NgOptimizedImage } from '@angular/common';
import { Component, input, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { apiErrorMessage } from '../../../core/http/api-error';

let nextId = 0;

/** Taille maximale vérifiée avant l'envoi ; le serveur contrôle aussi taille et format. */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Photo d'un élément de la carte : aperçu de l'image actuelle, choix d'un fichier, envoi
 * immédiat par `upload`, retrait par `remove` (bouton affiché seulement s'il y a une photo)
 * et état annoncé aux lecteurs d'écran.
 */
@Component({
  selector: 'app-image-field',
  imports: [NgOptimizedImage],
  template: `
    <div class="image-field">
      @if (imageUrl(); as url) {
        <img class="image-field__preview" [ngSrc]="url" width="160" height="120" [alt]="alt()" />
      } @else {
        <span class="image-field__empty" i18n="@@image.none">Pas de photo</span>
      }
      <label class="field__label" [for]="id">{{ label() }}</label>
      <input
        class="image-field__input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        [id]="id"
        [disabled]="busy()"
        [attr.aria-describedby]="id + '-status'"
        (change)="onFile($event)"
      />
      @if (remove() && imageUrl()) {
        <button
          type="button"
          class="btn btn--outline image-field__remove"
          [disabled]="busy()"
          (click)="onRemove()"
          i18n="@@image.remove"
        >
          Retirer la photo
        </button>
      }
      <p class="field__hint" [id]="id + '-status'" role="status">{{ status() }}</p>
    </div>
  `,
})
export class ImageField {
  readonly label = input.required<string>();
  readonly imageUrl = input<string | null | undefined>(null);
  /** Texte alternatif de l'aperçu (nom de l'élément). */
  readonly alt = input('');
  readonly upload = input.required<(file: File) => Observable<unknown>>();
  readonly remove = input<(() => Observable<unknown>) | undefined>(undefined);

  protected readonly id = `image-${nextId++}`;
  protected readonly busy = signal(false);
  protected readonly status = signal('');

  protected async onFile(event: Event): Promise<void> {
    const control = event.target as HTMLInputElement;
    const file = control.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > MAX_BYTES) {
      this.status.set($localize`:@@image.tooBig:Photo trop lourde : 5 Mo au maximum.`);
      control.value = '';
      return;
    }
    this.busy.set(true);
    this.status.set($localize`:@@image.sending:Envoi de la photo…`);
    try {
      await firstValueFrom(this.upload()(file));
      this.status.set($localize`:@@image.sent:Photo enregistrée.`);
    } catch (error) {
      this.status.set(apiErrorMessage(error));
    } finally {
      this.busy.set(false);
      control.value = '';
    }
  }

  protected async onRemove(): Promise<void> {
    const remove = this.remove();
    if (!remove) {
      return;
    }
    this.busy.set(true);
    this.status.set($localize`:@@image.removing:Retrait de la photo…`);
    try {
      await firstValueFrom(remove());
      this.status.set($localize`:@@image.removed:Photo retirée.`);
    } catch (error) {
      this.status.set(apiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
