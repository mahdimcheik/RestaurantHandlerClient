import { Component, computed, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';

let nextId = 0;

/** Texte sur plusieurs lignes lié à un champ Signal Forms. */
@Component({
  selector: 'app-textarea-field',
  imports: [FormField],
  template: `
    <div class="field" [class.field--invalid]="showErrors()">
      <label class="field__label" [for]="id">{{ label() }}</label>
      <textarea
        rows="3"
        [id]="id"
        [formField]="field()"
        [attr.aria-invalid]="showErrors()"
        [attr.aria-describedby]="showErrors() ? id + '-errors' : null"
      ></textarea>
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
export class TextareaField {
  readonly field = input.required<FieldTree<string>>();
  readonly label = input.required<string>();

  protected readonly id = `textarea-${nextId++}`;
  protected readonly state = computed(() => this.field()());
  protected readonly showErrors = computed(() => this.state().touched() && this.state().invalid());
}
