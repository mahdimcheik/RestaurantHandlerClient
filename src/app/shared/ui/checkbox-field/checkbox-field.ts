import { Component, computed, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';

let nextId = 0;

/** Case à cocher liée à un champ Signal Forms ; le libellé est projeté (texte et liens). */
@Component({
  selector: 'app-checkbox-field',
  imports: [FormField],
  template: `
    <div class="checkbox" [class.field--invalid]="showErrors()">
      <input
        type="checkbox"
        [id]="id"
        [formField]="field()"
        [attr.aria-invalid]="showErrors()"
        [attr.aria-describedby]="showErrors() ? id + '-errors' : null"
      />
      <label class="checkbox__label" [for]="id"><ng-content /></label>
      @if (showErrors()) {
        <ul class="field__errors checkbox__errors" [id]="id + '-errors'">
          @for (error of state().errors(); track error.kind) {
            <li class="field__error">{{ error.message }}</li>
          }
        </ul>
      }
    </div>
  `,
})
export class CheckboxField {
  readonly field = input.required<FieldTree<boolean>>();

  protected readonly id = `checkbox-${nextId++}`;
  protected readonly state = computed(() => this.field()());
  protected readonly showErrors = computed(() => this.state().touched() && this.state().invalid());
}
