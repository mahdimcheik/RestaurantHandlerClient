import { Component, computed, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import {
  MenuDetails,
  MenuSlotDetails,
  ProductDetails,
  SlotOptionDetails,
} from '../../../core/api/generated';
import { StoreService } from '../../../shared/services/store.service';
import { EurosPipe } from '../../../shared/utils/money';
import { isCustomizable, missingGroups, requiresChoice, stateOf } from '../customization';
import { Customization, MenuChoice, NO_CUSTOMIZATION } from '../data-access/counter-cart';
import { ProductCustomizer } from './product-customizer';

let nextId = 0;

/**
 * Composition d'un menu, emplacement par emplacement, dans un `<dialog>`. Un emplacement
 * obligatoire à option unique est rempli d'office ; un produit à choix obligatoire ouvre sa
 * personnalisation aussitôt.
 */
@Component({
  selector: 'app-menu-composer',
  imports: [EurosPipe, ProductCustomizer],
  template: `
    <dialog #dialog class="dialog dialog--wide" [attr.aria-labelledby]="id + '-title'">
      @if (menu(); as menu) {
        <div class="dialog__body">
          <h2 [id]="id + '-title'">{{ menu.name }}</h2>
          @for (slot of slots(); track slot.id) {
            <fieldset class="picker" [class.picker--missing]="!slotComplete(slot)">
              <legend class="picker__legend">
                {{ slot.label }}
                <span class="picker__rule">{{ ruleText(slot) }}</span>
              </legend>
              <div class="tiles tiles--compact">
                @for (option of slot.options; track option.productId) {
                  <button
                    type="button"
                    class="tile"
                    [attr.aria-pressed]="isChosen(slot, option)"
                    [disabled]="!isOrderable(option)"
                    (click)="toggle(slot, option)"
                  >
                    <span class="tile__name">{{ option.productName }}</span>
                    @if (!isOrderable(option)) {
                      <span class="tile__meta" i18n="@@status.outOfStock">Rupture</span>
                    } @else if (option.extraPriceCents > 0) {
                      <span class="tile__meta">+ {{ option.extraPriceCents | euros }}</span>
                    }
                  </button>
                }
              </div>
              @for (choice of choicesOf(slot); track $index) {
                @if (productOf(choice.productId); as product) {
                  @if (isCustomizable(product)) {
                    <p class="picker__chosen">
                      <span>
                        {{ choice.productName }}
                        @if (choice.customization.labels.length > 0) {
                          — {{ choice.customization.labels.join(', ') }}
                        }
                        @if (needsChoice(choice)) {
                          <span class="badge badge--danger" i18n="@@counter.choiceMissing"
                            >Choix à faire</span
                          >
                        }
                      </span>
                      <button
                        type="button"
                        class="btn btn--outline"
                        (click)="customize(choice)"
                        i18n="@@counter.customizeNamed"
                      >
                        Personnaliser {{ choice.productName }}
                      </button>
                    </p>
                  }
                }
              }
            </fieldset>
          }
          <div class="form__actions">
            <button
              type="button"
              class="btn"
              [disabled]="!complete()"
              (click)="apply()"
              i18n="@@counter.addMenu"
            >
              Ajouter le menu
            </button>
            <button type="button" class="btn btn--outline" (click)="close()" i18n="@@dialog.cancel">
              Annuler
            </button>
          </div>
        </div>
      }
    </dialog>
    <app-product-customizer (applied)="customized($event)" />
  `,
})
export class MenuComposer {
  private readonly store = inject(StoreService);

  readonly applied = output<MenuChoice[]>();

  protected readonly id = `menu-composer-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly customizer = viewChild.required(ProductCustomizer);

  protected readonly menu = signal<MenuDetails | null>(null);
  private readonly choices = signal<MenuChoice[]>([]);
  /** Choix dont la personnalisation est ouverte. */
  private readonly editing = signal<MenuChoice | null>(null);

  protected readonly slots = computed(() =>
    [...(this.menu()?.slots ?? [])].sort((a, b) => a.position - b.position),
  );
  private readonly products = computed(
    () => new Map(this.store.products.value().map((product) => [product.id, product])),
  );
  protected readonly complete = computed(
    () =>
      this.slots().every((slot) => this.slotComplete(slot)) &&
      !this.choices().some((choice) => this.needsChoice(choice)),
  );
  protected readonly isCustomizable = isCustomizable;

  constructor() {
    this.store.products.load();
  }

  open(menu: MenuDetails, initial: MenuChoice[] = []): void {
    this.menu.set(menu);
    this.choices.set(initial.length > 0 ? initial : this.prefilled(menu));
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected productOf(productId: string): ProductDetails | undefined {
    return this.products().get(productId);
  }

  protected isOrderable(option: SlotOptionDetails): boolean {
    const product = this.productOf(option.productId);
    return !!product && product.isActive && product.isAvailable;
  }

  protected choicesOf(slot: MenuSlotDetails): MenuChoice[] {
    return this.choices().filter((choice) => choice.slotId === slot.id);
  }

  protected isChosen(slot: MenuSlotDetails, option: SlotOptionDetails): boolean {
    return this.choicesOf(slot).some((choice) => choice.productId === option.productId);
  }

  protected slotComplete(slot: MenuSlotDetails): boolean {
    const count = this.choicesOf(slot).length;
    return count >= slot.minChoices && count <= slot.maxChoices;
  }

  protected needsChoice(choice: MenuChoice): boolean {
    const product = this.productOf(choice.productId);
    return !!product && missingGroups(product, stateOf(choice.customization)).length > 0;
  }

  protected ruleText(slot: MenuSlotDetails): string {
    if (slot.minChoices === slot.maxChoices) {
      return $localize`:@@counter.ruleExact:choisir ${slot.minChoices}:count:`;
    }
    return slot.minChoices > 0
      ? $localize`:@@counter.ruleRange:de ${slot.minChoices}:min: à ${slot.maxChoices}:max:`
      : $localize`:@@counter.ruleUpTo:facultatif, ${slot.maxChoices}:max: au plus`;
  }

  /** Choix unique : remplace le précédent ; sinon ajoute ou retire, dans la limite du maximum. */
  protected toggle(slot: MenuSlotDetails, option: SlotOptionDetails): void {
    const chosen = this.isChosen(slot, option);
    const choice: MenuChoice = {
      slotId: slot.id,
      productId: option.productId,
      productName: option.productName,
      customization: NO_CUSTOMIZATION,
    };
    this.choices.update((choices) => {
      if (chosen) {
        return choices.filter((c) => !(c.slotId === slot.id && c.productId === option.productId));
      }
      if (slot.maxChoices === 1) {
        return [...choices.filter((c) => c.slotId !== slot.id), choice];
      }
      return this.choicesOf(slot).length < slot.maxChoices ? [...choices, choice] : choices;
    });
    const product = this.productOf(option.productId);
    if (!chosen && product && requiresChoice(product) && this.isChosen(slot, option)) {
      this.editing.set(choice);
      this.customizer().open(product, NO_CUSTOMIZATION, true);
    }
  }

  protected customize(choice: MenuChoice): void {
    const product = this.productOf(choice.productId);
    if (product) {
      this.editing.set(choice);
      this.customizer().open(product, choice.customization);
    }
  }

  protected customized(customization: Customization): void {
    const editing = this.editing();
    this.choices.update((choices) =>
      choices.map((choice) => (choice === editing ? { ...choice, customization } : choice)),
    );
    this.editing.set(null);
  }

  protected apply(): void {
    if (!this.complete()) {
      return;
    }
    this.close();
    this.applied.emit(this.choices());
  }

  private prefilled(menu: MenuDetails): MenuChoice[] {
    return menu.slots
      .filter((slot) => slot.minChoices > 0 && slot.options.length === 1)
      .map((slot) => ({
        slotId: slot.id,
        productId: slot.options[0].productId,
        productName: slot.options[0].productName,
        customization: NO_CUSTOMIZATION,
      }));
  }
}
