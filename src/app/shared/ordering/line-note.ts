import { Component, computed, model } from '@angular/core';
import { MAX_LINE_NOTE_LENGTH } from './cart';

let nextId = 0;

/** Note facultative du client pour la cuisine sur un article (produit ou menu). */
@Component({
  selector: 'app-line-note',
  template: `
    <div class="field line-note">
      <label class="field__label" [for]="id">Une précision pour la cuisine ? (facultatif)</label>
      <textarea
        rows="2"
        [id]="id"
        [attr.aria-describedby]="id + '-hint'"
        [maxLength]="max"
        placeholder="Bien cuite, sauce à part…"
        [value]="note()"
        (input)="onInput($event)"
      ></textarea>
      <p class="field__hint" [id]="id + '-hint'">
        @if (left() === 1) {
          1 caractère restant
        } @else {
          {{ left() }} caractères restants
        }
      </p>
    </div>
  `,
})
export class LineNote {
  readonly note = model('');

  protected readonly max = MAX_LINE_NOTE_LENGTH;
  protected readonly id = `line-note-${nextId++}`;
  protected readonly left = computed(() => this.max - this.note().length);

  protected onInput(event: Event): void {
    this.note.set((event.target as HTMLTextAreaElement).value);
  }
}
