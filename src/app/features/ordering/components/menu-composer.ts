import { Component, computed, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { Customization, MenuChoice, NO_CUSTOMIZATION } from '../../../shared/ordering/cart';
import {
  CustomizeRequest,
  menuComplete,
  MenuSlots,
  prefilledChoices,
} from '../../../shared/ordering/menu-slots';
import {
  ComposableMenu,
  CustomizableProduct,
  fromManageProduct,
} from '../../../shared/ordering/model';
import { StoreService } from '../../../shared/services/store.service';
import { ProductCustomizer } from './product-customizer';

let nextId = 0;

/**
 * Composition d'un menu dans un `<dialog>`. Un emplacement obligatoire à option unique est rempli
 * d'office ; un produit à choix obligatoire ouvre sa personnalisation aussitôt.
 */
@Component({
  selector: 'app-menu-composer',
  imports: [MenuSlots, ProductCustomizer],
  template: `
    <dialog #dialog class="dialog dialog--wide" [attr.aria-labelledby]="id + '-title'">
      @if (menu(); as menu) {
        <div class="dialog__body">
          <h2 [id]="id + '-title'">{{ menu.name }}</h2>
          <app-menu-slots
            [menu]="menu"
            [products]="products()"
            [(choices)]="choices"
            (customize)="customize($event)"
          />
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

  protected readonly menu = signal<ComposableMenu | null>(null);
  protected readonly choices = signal<MenuChoice[]>([]);
  /** Choix dont la personnalisation est ouverte. */
  private readonly editing = signal<MenuChoice | null>(null);

  protected readonly products = computed(
    () =>
      new Map<string, CustomizableProduct>(
        this.store.products.value().map((product) => [product.id, fromManageProduct(product)]),
      ),
  );
  protected readonly complete = computed(() => {
    const menu = this.menu();
    return !!menu && menuComplete(menu, this.choices(), this.products());
  });

  constructor() {
    this.store.products.load();
  }

  open(menu: ComposableMenu, initial: MenuChoice[] = []): void {
    this.menu.set(menu);
    this.choices.set(initial.length > 0 ? initial : prefilledChoices(menu));
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected customize({ choice, product, quick }: CustomizeRequest): void {
    this.editing.set(choice);
    this.customizer().open(product, quick ? NO_CUSTOMIZATION : choice.customization, quick);
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
}
