import { Component, computed, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';

let nextId = 0;

/** Champ numérique entier lié à un champ Signal Forms : libellé, aide et erreurs annoncées. */
@Component({
  selector: 'app-number-field',
  imports: [FormField],
  template: `
    <div class="field" [class.field--invalid]="showErrors()">
      <label class="field__label" [for]="id">{{ label() }}</label>
      <input
        type="number"
        inputmode="numeric"
        step="1"
        [id]="id"
        [formField]="field()"
        [attr.aria-invalid]="showErrors()"
        [attr.aria-describedby]="describedBy()"
      />
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
export class NumberField {
  readonly field = input.required<FieldTree<number>>();
  readonly label = input.required<string>();
  readonly hint = input('');

  protected readonly id = `number-${nextId++}`;
  protected readonly state = computed(() => this.field()());
  protected readonly showErrors = computed(() => this.state().touched() && this.state().invalid());
  protected readonly describedBy = computed(
    () =>
      [this.hint() ? `${this.id}-hint` : '', this.showErrors() ? `${this.id}-errors` : '']
        .filter(Boolean)
        .join(' ') || null,
  );
}
