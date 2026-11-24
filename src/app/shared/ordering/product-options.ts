import { Component, computed, input, model, output } from '@angular/core';
import { Icon } from '../ui/icon/icon';
import { EurosPipe, formatEuros } from '../utils/money';
import {
  canAddChoice,
  CustomizationState,
  isSingleChoice,
  missingGroups,
  pickChoice,
  ruleText,
  setIngredient,
  stepChoice,
} from './customization';
import {
  ChoiceGroup,
  ChoiceOption,
  CustomizableProduct,
  ProductIngredient,
  ReplacementOption,
  replacementSurcharge,
} from './model';

/**
 * Réglages d'un produit : « Sans X », remplacement par un ingrédient proposé (ADR-0012), choix
 * d'options dans leurs bornes. Corps commun au dialogue du comptoir et à la fiche produit en
 * ligne ; l'état vit chez le parent (`[(state)]`).
 */
@Component({
  selector: 'app-product-options',
  imports: [Icon, EurosPipe],
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

    @for (group of product().groups; track group.id) {
      <fieldset class="picker" [class.picker--missing]="isMissing(group)">
        <legend class="picker__legend">
          {{ group.label }}
          <span class="picker__rule">{{ rule(group) }}</span>
        </legend>
        @if (isSingle(group)) {
          <div class="tiles tiles--compact">
            @for (choice of group.choices; track choice.id) {
              <button
                type="button"
                class="tile"
                [attr.aria-pressed]="quantityOf(choice) > 0"
                [disabled]="!choice.isAvailable"
                (click)="pick(group, choice)"
              >
                <span class="tile__name">{{ choice.name }}</span>
                @if (!choice.isAvailable) {
                  <span class="tile__meta">Rupture</span>
                } @else if (choice.extraPriceCents > 0) {
                  <span class="tile__meta">+ {{ choice.extraPriceCents | euros }}</span>
                }
              </button>
            }
          </div>
        } @else {
          <ul class="picker__rows">
            @for (choice of group.choices; track choice.id) {
              <li class="picker__row">
                <span class="picker__name">
                  {{ choice.name }}
                  @if (!choice.isAvailable) {
                    <span class="badge badge--danger">Rupture</span>
                  } @else if (choice.extraPriceCents > 0) {
                    <span class="picker__price">+ {{ choice.extraPriceCents | euros }}</span>
                  }
                </span>
                <span class="stepper">
                  <button
                    type="button"
                    class="icon-button"
                    [disabled]="quantityOf(choice) === 0"
                    (click)="step(group, choice, -1)"
                  >
                    <app-icon name="minus" />
                    <span class="visually-hidden">Un de moins : {{ choice.name }}</span>
                  </button>
                  <span class="stepper__value stepper__value--small">{{ quantityOf(choice) }}</span>
                  <button
                    type="button"
                    class="icon-button"
                    [disabled]="!canAdd(group, choice)"
                    (click)="step(group, choice, 1)"
                  >
                    <app-icon name="plus" />
                    <span class="visually-hidden">Un de plus : {{ choice.name }}</span>
                  </button>
                </span>
              </li>
            }
          </ul>
        }
      </fieldset>
    }
  `,
})
export class ProductOptions {
  readonly product = input.required<CustomizableProduct>();
  readonly replacements = input<readonly ReplacementOption[]>([]);
  readonly state = model.required<CustomizationState>();
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

  protected isSingle(group: ChoiceGroup): boolean {
    return isSingleChoice(group);
  }

  protected isMissing(group: ChoiceGroup): boolean {
    return this.missing().includes(group);
  }

  protected rule(group: ChoiceGroup): string {
    return ruleText(group.min, group.max);
  }

  protected quantityOf(choice: ChoiceOption): number {
    return this.state().choices[choice.id] ?? 0;
  }

  protected canAdd(group: ChoiceGroup, choice: ChoiceOption): boolean {
    return canAddChoice(group, choice, this.state());
  }

  protected pick(group: ChoiceGroup, choice: ChoiceOption): void {
    this.state.update((state) => pickChoice(state, group, choice));
    this.picked.emit();
  }

  protected step(group: ChoiceGroup, choice: ChoiceOption, delta: 1 | -1): void {
    this.state.update((state) => stepChoice(state, group, choice, delta));
  }
}
