import { NgOptimizedImage } from '@angular/common';
import { Component, input, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { apiErrorMessage } from '../../../core/http/api-error';
import { Icon } from '../icon/icon';

let nextId = 0;

/** Taille maximale vérifiée avant l'envoi ; le serveur contrôle aussi taille et format. */
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Photo d'un élément de la carte : aperçu de l'image actuelle (cliquable et cible de
 * glisser-déposer), bouton de choix en français à la place du champ natif (masqué mais
 * focalisable), envoi immédiat par `upload`, retrait par `remove` (bouton affiché seulement
 * s'il y a une photo) et état annoncé aux lecteurs d'écran.
 */
@Component({
  selector: 'app-image-field',
  imports: [NgOptimizedImage, Icon],
  template: `
    <div
      class="image-field"
      [class.image-field--over]="over()"
      [class.image-field--busy]="busy()"
      (dragover)="onDragOver($event)"
      (dragleave)="over.set(false)"
      (drop)="onDrop($event)"
    >
      <span class="field__label" [id]="id + '-label'">{{ label() }}</span>
      <div class="image-field__body">
        <label class="image-field__zone" [for]="id">
          @if (imageUrl(); as url) {
            <img
              class="image-field__preview"
              [ngSrc]="url"
              width="160"
              height="120"
              [alt]="alt()"
            />
          } @else {
            <span class="image-field__empty">
              <app-icon name="camera" />
              <span>Pas de photo</span>
            </span>
          }
        </label>
        <div class="image-field__side">
          <div class="image-field__actions">
            <label class="btn btn--outline image-field__pick">
              <input
                class="visually-hidden"
                type="file"
                [accept]="accept"
                [id]="id"
                [disabled]="busy()"
                [attr.aria-labelledby]="id + '-label ' + id + '-pick'"
                [attr.aria-describedby]="id + '-hint ' + id + '-status'"
                (change)="onChange($event)"
              />
              <app-icon name="camera" />
              <span [id]="id + '-pick'">
                {{ imageUrl() ? 'Changer la photo' : 'Choisir une photo' }}
              </span>
            </label>
            @if (remove() && imageUrl()) {
              <button
                type="button"
                class="btn btn--outline image-field__remove"
                [disabled]="busy()"
                (click)="onRemove()"
              >
                Retirer la photo
              </button>
            }
          </div>
          <p class="field__hint" [id]="id + '-hint'">
            JPEG, PNG ou WebP, 5 Mo au maximum. Vous pouvez aussi glisser l’image sur l’aperçu.
          </p>
          <p class="field__hint" [id]="id + '-status'" role="status">{{ status() }}</p>
        </div>
      </div>
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
  protected readonly accept = TYPES.join(',');
  protected readonly busy = signal(false);
  protected readonly status = signal('');
  protected readonly over = signal(false);

  protected async onChange(event: Event): Promise<void> {
    const control = event.target as HTMLInputElement;
    const file = control.files?.[0];
    control.value = '';
    if (file) {
      await this.send(file);
    }
  }

  protected onDragOver(event: DragEvent): void {
    if (this.busy() || !event.dataTransfer?.types.includes('Files')) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    this.over.set(true);
  }

  protected async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.over.set(false);
    const file = event.dataTransfer?.files[0];
    if (file && !this.busy()) {
      await this.send(file);
    }
  }

  protected async onRemove(): Promise<void> {
    const remove = this.remove();
    if (!remove) {
      return;
    }
    this.busy.set(true);
    this.status.set('Retrait de la photo…');
    try {
      await firstValueFrom(remove());
      this.status.set('Photo retirée.');
    } catch (error) {
      this.status.set(apiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private async send(file: File): Promise<void> {
    if (!TYPES.includes(file.type)) {
      this.status.set('Format non pris en charge : JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      this.status.set('Photo trop lourde : 5 Mo au maximum.');
      return;
    }
    this.busy.set(true);
    this.status.set('Envoi de la photo…');
    try {
      await firstValueFrom(this.upload()(file));
      this.status.set('Photo enregistrée.');
    } catch (error) {
      this.status.set(apiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
