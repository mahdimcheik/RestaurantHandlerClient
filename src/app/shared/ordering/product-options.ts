import { Component, computed, input, model, output } from '@angular/core';
import { formatEuros } from '../utils/money';
import { CustomizationState, missingGroups, ruleText, setIngredient } from './customization';
import {
  ChoiceGroup,
  CustomizableProduct,
  ProductIngredient,
  ReplacementOption,
  replacementSurcharge,
} from './model';
import { OptionGroup } from './option-group';

/**
 * Réglages d'un produit : « Sans X », remplacement par un ingrédient proposé (ADR-0012), choix
 * d'options dans leurs bornes. Corps commun au dialogue du comptoir et à la fiche produit en
 * ligne ; l'état vit chez le parent (`[(state)]`).
 */
@Component({
  selector: 'app-product-options',
  imports: [OptionGroup],
  template: `
    @if (removable().length > 0) {
      <fieldset class="picker">
        <legend class="picker__legend">Composition</legend>
        <ul class="picker__rows">
          @for (ingredient of removable(); track ingredient.id) {
            <li class="picker__row">
              <button
                type="button"
                class="chip"
                [attr.aria-pressed]="isRemoved(ingredient.id)"
                (click)="toggleRemove(ingredient.id)"
              >
                Sans {{ ingredient.name }}
              </button>
              @if (!ingredient.isAvailable) {
                <span class="badge badge--danger">Rupture</span>
              }
              @if (candidates(ingredient).length > 0) {
                <label class="picker__replace">
                  <span class="visually-hidden">Remplacer {{ ingredient.name }} par</span>
                  <select
                    #replace
                    [value]="replacementOf(ingredient.id)"
                    (change)="setReplacement(ingredient.id, replace.value)"
                  >
                    <option value="">Pas de remplacement</option>
                    @for (candidate of candidates(ingredient); track candidate.id) {
                      <option
                        [value]="candidate.id"
                        [selected]="replacementOf(ingredient.id) === candidate.id"
                      >
                        {{ replaceText(ingredient, candidate) }}
                      </option>
                    }
                  </select>
                </label>
              }
            </li>
          }
        </ul>
      </fieldset>
    }

    @if (groups()) {
      @for (group of product().groups; track group.id) {
        <fieldset class="picker" [class.picker--missing]="isMissing(group)">
          <legend class="picker__legend">
            {{ group.label }}
            <span class="picker__rule">{{ rule(group) }}</span>
          </legend>
          <app-option-group [group]="group" [(state)]="state" (picked)="picked.emit()" />
        </fieldset>
      }
    }
  `,
})
export class ProductOptions {
  readonly product = input.required<CustomizableProduct>();
  readonly replacements = input<readonly ReplacementOption[]>([]);
  readonly state = model.required<CustomizationState>();
  /** `false` : la composition seule, les groupes étant choisis ailleurs (assistant pas à pas). */
  readonly groups = input(true);
  /** Un choix unique vient d'être fait (le comptoir valide alors en mode rapide). */
  readonly picked = output<void>();

  protected readonly removable = computed(() =>
    this.product().ingredients.filter((ingredient) => ingredient.isRemovable),
  );
  private readonly missing = computed(() => missingGroups(this.product(), this.state()));

  protected candidates(ingredient: ProductIngredient): readonly ReplacementOption[] {
    return this.replacements().filter((candidate) => candidate.id !== ingredient.id);
  }

  protected replaceText(ingredient: ProductIngredient, candidate: ReplacementOption): string {
    const extra = replacementSurcharge(ingredient, candidate);
    return extra
      ? `Remplacer par ${candidate.name} (+ ${formatEuros(extra)})`
      : `Remplacer par ${candidate.name}`;
  }

  protected isRemoved(ingredientId: string): boolean {
    return this.state().ingredients[ingredientId]?.removed ?? false;
  }

  protected replacementOf(ingredientId: string): string {
    return this.state().ingredients[ingredientId]?.replacementId ?? '';
  }

  protected toggleRemove(ingredientId: string): void {
    const removed = !this.isRemoved(ingredientId);
    this.state.update((state) =>
      setIngredient(state, ingredientId, { removed, replacementId: null }),
    );
  }

  protected setReplacement(ingredientId: string, replacementId: string): void {
    this.state.update((state) =>
      setIngredient(state, ingredientId, { removed: false, replacementId: replacementId || null }),
    );
  }

  protected isMissing(group: ChoiceGroup): boolean {
    return this.missing().includes(group);
  }

  protected rule(group: ChoiceGroup): string {
    return ruleText(group.min, group.max);
  }
}
