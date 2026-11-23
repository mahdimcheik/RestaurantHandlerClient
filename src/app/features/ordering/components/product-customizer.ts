import { Component, computed, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import {
  OptionChoiceDetails,
  OptionGroupDetails,
  ProductDetails,
} from '../../../core/api/generated';
import { StoreService } from '../../../shared/services/store.service';
import { Icon } from '../../../shared/ui/icon/icon';
import {
  activeGroups,
  chosenCount,
  CustomizationState,
  groupRules,
  isSingleChoice,
  missingGroups,
  stateOf,
  toCustomization,
} from '../customization';
import { Customization, NO_CUSTOMIZATION } from '../data-access/counter-cart';

let nextId = 0;

/**
 * Personnalisation d'un produit dans un `<dialog>` : « Sans X », remplacement par un ingrédient
 * proposé (ADR-0012), choix d'options dans leurs bornes. En mode rapide (ajout d'un produit à
 * choix obligatoire), le dernier choix unique requis valide aussitôt, les options facultatives
 * restant accessibles par « Personnaliser » : produit + choix = 2 touches.
 */
@Component({
  selector: 'app-product-customizer',
  imports: [Icon],
  template: `
    <dialog #dialog class="dialog dialog--wide" [attr.aria-labelledby]="id + '-title'">
      @if (product(); as product) {
        <div class="dialog__body">
          <h2 [id]="id + '-title'">{{ product.name }}</h2>

          @if (removable().length > 0) {
            <fieldset class="picker">
              <legend class="picker__legend" i18n="@@counter.composition">Composition</legend>
              <ul class="picker__rows">
                @for (ingredient of removable(); track ingredient.ingredientId) {
                  <li class="picker__row">
                    <button
                      type="button"
                      class="chip"
                      [attr.aria-pressed]="isRemoved(ingredient.ingredientId)"
                      (click)="toggleRemove(ingredient.ingredientId)"
                      i18n="@@counter.withoutButton"
                    >
                      Sans {{ ingredient.name }}
                    </button>
                    @if (!ingredient.isAvailable) {
                      <span class="badge badge--danger" i18n="@@status.outOfStock">Rupture</span>
                    }
                    @if (replacements().length > 0) {
                      <label class="picker__replace">
                        <span class="visually-hidden" i18n="@@counter.replaceLabel"
                          >Remplacer {{ ingredient.name }} par</span
                        >
                        <select
                          #replace
                          [value]="replacementOf(ingredient.ingredientId)"
                          (change)="setReplacement(ingredient.ingredientId, replace.value)"
                        >
                          <option value="" i18n="@@counter.noReplacement">
                            Pas de remplacement
                          </option>
                          @for (candidate of replacements(); track candidate.id) {
                            @if (candidate.id !== ingredient.ingredientId) {
                              <option
                                [value]="candidate.id"
                                [selected]="replacementOf(ingredient.ingredientId) === candidate.id"
                                i18n="@@counter.replaceWith"
                              >
                                Remplacer par {{ candidate.name }}
                              </option>
                            }
                          }
                        </select>
                      </label>
                    }
                  </li>
                }
              </ul>
            </fieldset>
          }

          @for (group of groups(); track group.id) {
            <fieldset class="picker" [class.picker--missing]="isMissing(group)">
              <legend class="picker__legend">
                {{ group.label }}
                <span class="picker__rule">{{ ruleText(group) }}</span>
              </legend>
              @if (isSingle(group)) {
                <div class="tiles tiles--compact">
                  @for (choice of sortedChoices(group); track choice.id) {
                    <button
                      type="button"
                      class="tile"
                      [attr.aria-pressed]="quantityOf(choice) > 0"
                      [disabled]="!choice.isAvailable"
                      (click)="pick(group, choice)"
                    >
                      <span class="tile__name">{{ choice.name }}</span>
                      @if (!choice.isAvailable) {
                        <span class="tile__meta" i18n="@@status.outOfStock">Rupture</span>
                      }
                    </button>
                  }
                </div>
              } @else {
                <ul class="picker__rows">
                  @for (choice of sortedChoices(group); track choice.id) {
                    <li class="picker__row">
                      <span class="picker__name">
                        {{ choice.name }}
                        @if (!choice.isAvailable) {
                          <span class="badge badge--danger" i18n="@@status.outOfStock"
                            >Rupture</span
                          >
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
                          <span class="visually-hidden" i18n="@@counter.less"
                            >Un de moins : {{ choice.name }}</span
                          >
                        </button>
                        <span class="stepper__value stepper__value--small">{{
                          quantityOf(choice)
                        }}</span>
                        <button
                          type="button"
                          class="icon-button"
                          [disabled]="!canAdd(group, choice)"
                          (click)="step(group, choice, 1)"
                        >
                          <app-icon name="plus" />
                          <span class="visually-hidden" i18n="@@counter.more"
                            >Un de plus : {{ choice.name }}</span
                          >
                        </button>
                      </span>
                    </li>
                  }
                </ul>
              }
            </fieldset>
          }

          <div class="form__actions">
            <button
              type="button"
              class="btn"
              [disabled]="missing().length > 0"
              (click)="apply()"
              i18n="@@counter.applyCustomization"
            >
              Valider
            </button>
            <button type="button" class="btn btn--outline" (click)="close()" i18n="@@dialog.cancel">
              Annuler
            </button>
          </div>
        </div>
      }
    </dialog>
  `,
})
export class ProductCustomizer {
  private readonly store = inject(StoreService);

  /** Personnalisation validée, pour le produit ouvert. */
  readonly applied = output<Customization>();

  protected readonly id = `customizer-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly product = signal<ProductDetails | null>(null);
  private readonly state = signal<CustomizationState>({ ingredients: {}, choices: {} });
  private readonly quick = signal(false);

  protected readonly removable = computed(() =>
    (this.product()?.composition.ingredients ?? []).filter((ingredient) => ingredient.isRemovable),
  );
  protected readonly groups = computed(() => {
    const product = this.product();
    return product ? activeGroups(product) : [];
  });
  protected readonly replacements = computed(() =>
    this.store.ingredients
      .value()
      .filter(
        (ingredient) =>
          ingredient.isOfferedAsReplacement && ingredient.isAvailable && !ingredient.isArchived,
      ),
  );
  protected readonly missing = computed(() => {
    const product = this.product();
    return product ? missingGroups(product, this.state()) : [];
  });

  constructor() {
    this.store.ingredients.load();
  }

  /** `quick` : ouverture à l'ajout, pour un choix obligatoire. */
  open(product: ProductDetails, initial: Customization = NO_CUSTOMIZATION, quick = false): void {
    this.product.set(product);
    this.state.set(stateOf(initial));
    this.quick.set(quick);
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected isRemoved(ingredientId: string): boolean {
    return this.state().ingredients[ingredientId]?.removed ?? false;
  }

  protected replacementOf(ingredientId: string): string {
    return this.state().ingredients[ingredientId]?.replacementId ?? '';
  }

  protected toggleRemove(ingredientId: string): void {
    const removed = !this.isRemoved(ingredientId);
    this.setIngredient(ingredientId, { removed, replacementId: null });
  }

  protected setReplacement(ingredientId: string, replacementId: string): void {
    this.setIngredient(ingredientId, { removed: false, replacementId: replacementId || null });
  }

  protected sortedChoices(group: OptionGroupDetails): OptionChoiceDetails[] {
    return [...group.choices].sort((a, b) => a.position - b.position);
  }

  protected isSingle(group: OptionGroupDetails): boolean {
    return isSingleChoice(group);
  }

  protected isMissing(group: OptionGroupDetails): boolean {
    return this.missing().includes(group);
  }

  protected ruleText(group: OptionGroupDetails): string {
    const { min, max } = groupRules(group);
    if (min === max) {
      return $localize`:@@counter.ruleExact:choisir ${min}:count:`;
    }
    return min > 0
      ? $localize`:@@counter.ruleRange:de ${min}:min: à ${max}:max:`
      : $localize`:@@counter.ruleUpTo:facultatif, ${max}:max: au plus`;
  }

  protected quantityOf(choice: OptionChoiceDetails): number {
    return this.state().choices[choice.id] ?? 0;
  }

  protected canAdd(group: OptionGroupDetails, choice: OptionChoiceDetails): boolean {
    const rules = groupRules(group);
    return (
      choice.isAvailable &&
      this.quantityOf(choice) < rules.maxPerChoice &&
      chosenCount(group, this.state()) < rules.max
    );
  }

  /** Choix unique : une touche sélectionne, une seconde désélectionne. */
  protected pick(group: OptionGroupDetails, choice: OptionChoiceDetails): void {
    const selected = this.quantityOf(choice) > 0;
    this.state.update((state) => {
      const choices = { ...state.choices };
      group.choices.forEach((other) => delete choices[other.id]);
      if (!selected) {
        choices[choice.id] = 1;
      }
      return { ...state, choices };
    });
    if (
      this.quick() &&
      this.missing().length === 0 &&
      this.groups().every((g) => groupRules(g).min === 0 || isSingleChoice(g))
    ) {
      this.apply();
    }
  }

  protected step(group: OptionGroupDetails, choice: OptionChoiceDetails, delta: 1 | -1): void {
    if (delta > 0 && !this.canAdd(group, choice)) {
      return;
    }
    this.state.update((state) => ({
      ...state,
      choices: { ...state.choices, [choice.id]: Math.max(0, this.quantityOf(choice) + delta) },
    }));
  }

  protected apply(): void {
    const product = this.product();
    if (!product || this.missing().length > 0) {
      return;
    }
    const names = new Map(
      this.store.ingredients.value().map((ingredient) => [ingredient.id, ingredient.name]),
    );
    this.close();
    this.applied.emit(toCustomization(product, this.state(), (id) => names.get(id) ?? ''));
  }

  private setIngredient(
    ingredientId: string,
    change: { removed: boolean; replacementId: string | null },
  ): void {
    this.state.update((state) => ({
      ...state,
      ingredients: { ...state.ingredients, [ingredientId]: change },
    }));
  }
}
