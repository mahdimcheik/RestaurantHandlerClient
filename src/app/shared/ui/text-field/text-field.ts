import { Component, computed, input, signal } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';

let nextId = 0;

/**
 * Champ de saisie lié à un champ Signal Forms : libellé, aide, erreurs annoncées
 * (`aria-describedby`, `aria-invalid`) et, pour un mot de passe, bouton « Afficher ».
 */
@Component({
  selector: 'app-text-field',
  imports: [FormField],
  template: `
    <div class="field" [class.field--invalid]="showErrors()">
      <label class="field__label" [for]="id">{{ label() }}</label>
      <div class="field__control">
        <input
          [id]="id"
          [type]="inputType()"
          [formField]="field()"
          [attr.autocomplete]="autocomplete()"
          [attr.inputmode]="inputmode()"
          [attr.aria-invalid]="showErrors()"
          [attr.aria-describedby]="describedBy()"
        />
        @if (type() === 'password') {
          <button
            type="button"
            class="field__toggle"
            [attr.aria-controls]="id"
            [attr.aria-pressed]="revealed()"
            (click)="revealed.set(!revealed())"
          >
            @if (revealed()) {
              <ng-container i18n="@@field.hidePassword">Masquer</ng-container>
            } @else {
              <ng-container i18n="@@field.showPassword">Afficher</ng-container>
            }
          </button>
        }
      </div>
      @if (hint()) {
        <p class="field__hint" [id]="id + '-hint'">{{ hint() }}</p>
      }
      @if (showErrors()) {
        <ul class="field__errors" [id]="id + '-errors'">
          @for (error of state().errors(); track error.kind) {
            <li class="field__error">{{ error.message }}</li>
          }
        </ul>
      }
    </div>
  `,
})
export class TextField {
  readonly field = input.required<FieldTree<string>>();
  readonly label = input.required<string>();
  readonly type = input<
    'text' | 'email' | 'password' | 'tel' | 'search' | 'time' | 'date' | 'datetime-local'
  >('text');
  readonly autocomplete = input('off');
  readonly hint = input('');
  /** Clavier virtuel adapté, ex. `decimal` pour un prix saisi en texte. */
  readonly inputmode = input<string | null>(null);

  protected readonly id = `field-${nextId++}`;
  protected readonly revealed = signal(false);
  protected readonly state = computed(() => this.field()());
  protected readonly showErrors = computed(() => this.state().touched() && this.state().invalid());
  protected readonly inputType = computed(() =>
    this.type() === 'password' && this.revealed() ? 'text' : this.type(),
  );
  protected readonly describedBy = computed(
    () =>
      [this.hint() ? `${this.id}-hint` : '', this.showErrors() ? `${this.id}-errors` : '']
        .filter(Boolean)
        .join(' ') || null,
  );
}
