import { Component, computed, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { Customization, NO_CUSTOMIZATION } from '../../../shared/ordering/cart';
import {
  CustomizationState,
  EMPTY_STATE,
  isSingleChoice,
  missingGroups,
  stateOf,
  toCustomization,
} from '../../../shared/ordering/customization';
import { CustomizableProduct, manageReplacements } from '../../../shared/ordering/model';
import { ProductOptions } from '../../../shared/ordering/product-options';
import { StoreService } from '../../../shared/services/store.service';

let nextId = 0;

/**
 * Personnalisation d'un produit dans un `<dialog>`. En mode rapide (ajout d'un produit à choix
 * obligatoire), le dernier choix unique requis valide aussitôt, les options facultatives restant
 * accessibles par « Personnaliser » : produit + choix = 2 touches.
 */
@Component({
  selector: 'app-product-customizer',
  imports: [ProductOptions],
  template: `
    <dialog #dialog class="dialog dialog--wide" [attr.aria-labelledby]="id + '-title'">
      @if (product(); as product) {
        <div class="dialog__body">
          <h2 [id]="id + '-title'">{{ product.name }}</h2>
          <app-product-options
            [product]="product"
            [replacements]="replacements()"
            [(state)]="state"
            (picked)="picked()"
          />
          <div class="form__actions">
            <button type="button" class="btn" [disabled]="missing().length > 0" (click)="apply()">
              Valider
            </button>
            <button type="button" class="btn btn--outline" (click)="close()">Annuler</button>
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

  protected readonly product = signal<CustomizableProduct | null>(null);
  protected readonly state = signal<CustomizationState>(EMPTY_STATE);
  private readonly quick = signal(false);

  protected readonly replacements = computed(() =>
    manageReplacements(this.store.ingredients.value()),
  );
  protected readonly missing = computed(() => {
    const product = this.product();
    return product ? missingGroups(product, this.state()) : [];
  });

  constructor() {
    this.store.ingredients.load();
  }

  /** `quick` : ouverture à l'ajout, pour un choix obligatoire. */
  open(
    product: CustomizableProduct,
    initial: Customization = NO_CUSTOMIZATION,
    quick = false,
  ): void {
    this.product.set(product);
    this.state.set(stateOf(initial));
    this.quick.set(quick);
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected picked(): void {
    const product = this.product();
    if (
      this.quick() &&
      product &&
      this.missing().length === 0 &&
      product.groups.every((g) => g.min === 0 || isSingleChoice(g))
    ) {
      this.apply();
    }
  }

  protected apply(): void {
    const product = this.product();
    if (!product || this.missing().length > 0) {
      return;
    }
    const names = new Map(this.replacements().map((r) => [r.id, r.name]));
    this.close();
    this.applied.emit(toCustomization(product, this.state(), (id) => names.get(id) ?? ''));
  }
}
