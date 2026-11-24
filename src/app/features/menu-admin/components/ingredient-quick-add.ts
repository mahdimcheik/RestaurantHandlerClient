import { Component, inject, input, output, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { IngredientDetails } from '../../../core/api/generated';
import { apiErrorMessage } from '../../../core/http/api-error';
import { eurosRule, focusFirstInvalid, nameRules } from '../../../shared/forms/validation';
import { IngredientsService } from '../../../shared/services/ingredients.service';
import { Icon } from '../../../shared/ui/icon/icon';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { parseEuros } from '../../../shared/utils/money';

/** Crée un ingrédient (nom, prix de référence) ; la liste en cache est rechargée par le service. */
@Component({
  selector: 'app-ingredient-quick-add',
  imports: [Icon, TextField],
  template: `
    <form class="inline-form" novalidate (submit)="onSubmit($event)">
      <app-text-field [field]="form.name" [label]="label()" />
      <app-text-field [field]="form.price" inputmode="decimal" label="Prix de référence (€)" />
      <button type="submit" class="btn btn--outline btn--icon" [disabled]="form().submitting()">
        <app-icon name="plus" />
        <span>{{ action() }}</span>
      </button>
    </form>
    @if (error()) {
      <p class="alert alert--error" role="alert">{{ error() }}</p>
    }
  `,
})
export class IngredientQuickAdd {
  readonly label = input('Nouvel ingrédient');
  readonly action = input('Ajouter');
  readonly created = output<IngredientDetails>();

  private readonly ingredients = inject(IngredientsService);

  private readonly model = signal(empty());
  protected readonly form = form(this.model, (path) => {
    nameRules(path.name);
    eurosRule(path.price, { required: true });
  });
  protected readonly error = signal('');

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set('');
    await submit(this.form, {
      action: async () => {
        try {
          const created = await firstValueFrom(
            this.ingredients.create({
              name: this.model().name.trim(),
              priceCents: parseEuros(this.model().price) ?? 0,
            }),
          );
          this.model.set(empty());
          this.form().reset();
          this.created.emit(created);
        } catch (error) {
          this.error.set(apiErrorMessage(error));
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }
}

const empty = () => ({ name: '', price: '0,00' });
