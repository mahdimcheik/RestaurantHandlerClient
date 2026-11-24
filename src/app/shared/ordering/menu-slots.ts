import { Component, input, model, output } from '@angular/core';
import { EurosPipe } from '../utils/money';
import { MenuChoice, NO_CUSTOMIZATION } from './cart';
import { isCustomizable, missingGroups, requiresChoice, ruleText, stateOf } from './customization';
import { ComposableMenu, CustomizableProduct, MenuOption, MenuSlot } from './model';

/** Demande de personnalisation d'un produit choisi ; `quick` à l'ajout d'un choix obligatoire. */
export interface CustomizeRequest {
  choice: MenuChoice;
  product: CustomizableProduct;
  quick: boolean;
}

export function choicesOf(choices: readonly MenuChoice[], slot: MenuSlot): MenuChoice[] {
  return choices.filter((choice) => choice.slotId === slot.id);
}

export function slotComplete(choices: readonly MenuChoice[], slot: MenuSlot): boolean {
  const count = choicesOf(choices, slot).length;
  return count >= slot.min && count <= slot.max;
}

/** Choix dont un groupe obligatoire du produit n'est pas rempli. */
export function choiceNeedsOptions(
  choice: MenuChoice,
  products: ReadonlyMap<string, CustomizableProduct>,
): boolean {
  const product = products.get(choice.productId);
  return !!product && missingGroups(product, stateOf(choice.customization)).length > 0;
}

/** Tous les emplacements dans leurs bornes et chaque produit choisi complet (US-E04-2). */
export function menuComplete(
  menu: ComposableMenu,
  choices: readonly MenuChoice[],
  products: ReadonlyMap<string, CustomizableProduct>,
): boolean {
  return (
    menu.slots.every((slot) => slotComplete(choices, slot)) &&
    !choices.some((choice) => choiceNeedsOptions(choice, products))
  );
}

/** Emplacements obligatoires à une seule option commandable : remplis d'office. */
export function prefilledChoices(menu: ComposableMenu): MenuChoice[] {
  return menu.slots
    .filter((slot) => slot.min > 0 && slot.options.length === 1 && slot.options[0].isAvailable)
    .map((slot) => ({
      slotId: slot.id,
      productId: slot.options[0].productId,
      productName: slot.options[0].name,
      customization: NO_CUSTOMIZATION,
    }));
}

/**
 * Composition d'un menu, emplacement par emplacement (US-E04-2). Corps commun au dialogue du
 * comptoir et à la page menu en ligne ; les choix vivent chez le parent (`[(choices)]`), qui
 * ouvre la personnalisation demandée par `customize`.
 */
@Component({
  selector: 'app-menu-slots',
  imports: [EurosPipe],
  template: `
    @for (slot of menu().slots; track slot.id) {
      <fieldset class="picker" [class.picker--missing]="!isComplete(slot)">
        <legend class="picker__legend">
          {{ slot.label }}
          <span class="picker__rule">{{ rule(slot) }}</span>
        </legend>
        <div class="tiles tiles--compact">
          @for (option of slot.options; track option.productId) {
            <button
              type="button"
              class="tile"
              [attr.aria-pressed]="isChosen(slot, option)"
              [disabled]="!option.isAvailable"
              (click)="toggle(slot, option)"
            >
              <span class="tile__name">{{ option.name }}</span>
              @if (!option.isAvailable) {
                <span class="tile__meta">Rupture</span>
              } @else if (option.extraPriceCents > 0) {
                <span class="tile__meta">+ {{ option.extraPriceCents | euros }}</span>
              }
            </button>
          }
        </div>
        @for (choice of slotChoices(slot); track $index) {
          @if (products().get(choice.productId); as product) {
            @if (canCustomize(product)) {
              <p class="picker__chosen">
                <span>
                  {{ choice.productName }}
                  @if (choice.customization.labels.length > 0) {
                    — {{ choice.customization.labels.join(', ') }}
                  }
                  @if (needsOptions(choice)) {
                    <span class="badge badge--danger">Choix à faire</span>
                  }
                </span>
                <button
                  type="button"
                  class="btn btn--outline"
                  (click)="customize.emit({ choice, product, quick: false })"
                >
                  Personnaliser {{ choice.productName }}
                </button>
              </p>
            }
          }
        }
      </fieldset>
    }
  `,
})
export class MenuSlots {
  readonly menu = input.required<ComposableMenu>();
  readonly products = input.required<ReadonlyMap<string, CustomizableProduct>>();
  readonly choices = model.required<MenuChoice[]>();
  readonly customize = output<CustomizeRequest>();

  protected readonly canCustomize = isCustomizable;

  protected slotChoices(slot: MenuSlot): MenuChoice[] {
    return choicesOf(this.choices(), slot);
  }

  protected isChosen(slot: MenuSlot, option: MenuOption): boolean {
    return this.slotChoices(slot).some((choice) => choice.productId === option.productId);
  }

  protected isComplete(slot: MenuSlot): boolean {
    return slotComplete(this.choices(), slot);
  }

  protected needsOptions(choice: MenuChoice): boolean {
    return choiceNeedsOptions(choice, this.products());
  }

  protected rule(slot: MenuSlot): string {
    return ruleText(slot.min, slot.max);
  }

  /** Choix unique : remplace le précédent ; sinon ajoute ou retire, dans la limite du maximum. */
  protected toggle(slot: MenuSlot, option: MenuOption): void {
    const chosen = this.isChosen(slot, option);
    const choice: MenuChoice = {
      slotId: slot.id,
      productId: option.productId,
      productName: option.name,
      customization: NO_CUSTOMIZATION,
    };
    this.choices.update((choices) => {
      if (chosen) {
        return choices.filter((c) => !(c.slotId === slot.id && c.productId === option.productId));
      }
      if (slot.max === 1) {
        return [...choices.filter((c) => c.slotId !== slot.id), choice];
      }
      return choicesOf(choices, slot).length < slot.max ? [...choices, choice] : choices;
    });
    const product = this.products().get(option.productId);
    if (!chosen && product && requiresChoice(product) && this.choices().includes(choice)) {
      this.customize.emit({ choice, product, quick: true });
    }
  }
}
