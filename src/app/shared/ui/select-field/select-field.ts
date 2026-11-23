import { Component, computed, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';

let nextId = 0;

export interface SelectOption {
  value: string;
  label: string;
}

/** Liste déroulante liée à un champ Signal Forms ; `placeholder` ajoute un choix vide. */
@Component({
  selector: 'app-select-field',
  imports: [FormField],
  template: `
    <div class="field" [class.field--invalid]="showErrors()">
      <label class="field__label" [for]="id">{{ label() }}</label>
      <select
        [id]="id"
        [formField]="field()"
        [attr.aria-invalid]="showErrors()"
        [attr.aria-describedby]="showErrors() ? id + '-errors' : null"
      >
        @if (placeholder()) {
          <option value="">{{ placeholder() }}</option>
        }
        @for (option of options(); track option.value) {
          <option [value]="option.value">{{ option.label }}</option>
        }
      </select>
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
export class SelectField {
  readonly field = input.required<FieldTree<string>>();
  readonly label = input.required<string>();
  readonly options = input.required<readonly SelectOption[]>();
  readonly placeholder = input('');

  protected readonly id = `select-${nextId++}`;
  protected readonly state = computed(() => this.field()());
  protected readonly showErrors = computed(() => this.state().touched() && this.state().invalid());
}
