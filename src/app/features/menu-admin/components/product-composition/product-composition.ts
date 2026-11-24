import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { form } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { CompositionDetails, IngredientDetails } from '../../../../core/api/generated';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { ProductsService } from '../../../../shared/services/products.service';
import { StoreService } from '../../../../shared/services/store.service';
import { CheckboxField } from '../../../../shared/ui/checkbox-field/checkbox-field';
import { Icon } from '../../../../shared/ui/icon/icon';
import { IngredientQuickAdd } from '../ingredient-quick-add';

interface CompositionModel {
  ingredients: { ingredientId: string; isRemovable: boolean }[];
}

const toModel = (composition: CompositionDetails | undefined): CompositionModel => ({
  ingredients:
    composition?.ingredients.map((ingredient) => ({
      ingredientId: ingredient.ingredientId,
      isRemovable: ingredient.isRemovable,
    })) ?? [],
});

/**
 * Ingrédients d'un produit, choisis dans la liste des ingrédients. Un ingrédient retirable se
 * retire ou se remplace par tout ingrédient « proposé en remplacement », au surcoût calculé par
 * le serveur d'après les prix de référence. Les suppléments passent par un groupe d'options.
 */
@Component({
  selector: 'app-product-composition',
  imports: [CheckboxField, Icon, IngredientQuickAdd],
  templateUrl: './product-composition.html',
})
export class ProductComposition {
  readonly productId = input.required<string>();
  readonly composition = input<CompositionDetails>();

  private readonly products = inject(ProductsService);
  private readonly store = inject(StoreService);

  protected readonly model = linkedSignal(() => toModel(this.composition()));
  protected readonly form = form(this.model);

  private readonly byId = computed(
    () => new Map(this.store.ingredients.value().map((ingredient) => [ingredient.id, ingredient])),
  );
  /** Ingrédients pas encore dans la composition, par ordre alphabétique. */
  protected readonly addable = computed(() => {
    const used = new Set(this.model().ingredients.map((ingredient) => ingredient.ingredientId));
    return this.store.ingredients
      .value()
      .filter((ingredient) => !used.has(ingredient.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  });

  protected readonly toAdd = signal('');
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  constructor() {
    this.store.ingredients.load();
  }

  protected ingredientOf(id: string): IngredientDetails | undefined {
    return this.byId().get(id);
  }

  protected add(ingredientId = this.toAdd()): void {
    if (!ingredientId) {
      return;
    }
    this.model.update((model) => ({
      ingredients: [...model.ingredients, { ingredientId, isRemovable: true }],
    }));
    this.toAdd.set('');
    this.notice.set('');
  }

  protected remove(index: number): void {
    this.model.update((model) => ({
      ingredients: model.ingredients.filter((_, i) => i !== index),
    }));
    this.notice.set('');
  }

  /** Un ingrédient créé depuis la fiche s'ajoute directement à la composition. */
  protected created(ingredient: IngredientDetails): void {
    this.add(ingredient.id);
    this.notice.set(`« ${ingredient.name} » créé et ajouté à la composition.`);
  }

  protected async save(): Promise<void> {
    this.error.set('');
    this.notice.set('');
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(
        this.products.setComposition(this.productId(), {
          ingredients: this.model().ingredients.map(({ ingredientId, isRemovable }) => ({
            ingredientId,
            isRemovable,
          })),
        }),
      );
      this.model.set(toModel(updated.composition));
      this.notice.set('Composition enregistrée.');
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }
}
