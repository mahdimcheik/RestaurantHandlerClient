import { Component, computed, inject, linkedSignal, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { form, submit } from '@angular/forms/signals';
import { firstValueFrom, switchMap, timer } from 'rxjs';
import { MenuDetails, OrderDetails, ProductDetails } from '../../../../core/api/generated';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { focusFirstInvalid, lengthRule } from '../../../../shared/forms/validation';
import { ManageOrdersService } from '../../../../shared/services/manage-orders.service';
import { OpeningStateService } from '../../../../shared/services/opening-state.service';
import { OrdersService } from '../../../../shared/services/orders.service';
import { StoreService } from '../../../../shared/services/store.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { EurosPipe } from '../../../../shared/utils/money';
import { MenuComposer } from '../../components/menu-composer';
import { PaymentPanel } from '../../components/payment-panel';
import { ProductCustomizer } from '../../components/product-customizer';
import { isCustomizable, requiresChoice } from '../../customization';
import {
  CounterCart,
  CounterLine,
  Customization,
  MenuChoice,
} from '../../data-access/counter-cart';

/** Onglet « Menus » à côté des catégories. */
const MENUS_TAB = 'menus';

/** Ligne du ticket en cours de personnalisation, ou produit en cours d'ajout. */
type Editing =
  | { kind: 'add'; product: ProductDetails }
  | { kind: 'product'; key: string }
  | { kind: 'menu'; key: string; menu: MenuDetails }
  | { kind: 'addMenu'; menu: MenuDetails };

/**
 * Saisie comptoir (US-E06-1), pensée pour une tablette tenue d'une main : catégories en
 * onglets, produits en tuiles, ticket à côté. Le total vient du devis du serveur (R2) ; la
 * commande part en cuisine à l'envoi et son numéro s'affiche en grand, prête à encaisser.
 */
@Component({
  selector: 'app-counter-page',
  host: { class: 'page' },
  imports: [RouterLink, Icon, EurosPipe, TextField, PaymentPanel, ProductCustomizer, MenuComposer],
  providers: [CounterCart],
  templateUrl: './counter-page.html',
})
export class CounterPage {
  private readonly store = inject(StoreService);
  private readonly orders = inject(OrdersService);
  private readonly manageOrders = inject(ManageOrdersService);
  private readonly opening = inject(OpeningStateService);
  protected readonly cart = inject(CounterCart);

  private readonly customizer = viewChild.required(ProductCustomizer);
  private readonly composer = viewChild.required(MenuComposer);

  protected readonly menusTab = MENUS_TAB;
  protected readonly categories = computed(() =>
    this.store.categories
      .value()
      .filter(
        (category) => category.isActive && !category.isArchived && category.activeProductCount > 0,
      )
      .sort((a, b) => a.position - b.position),
  );
  protected readonly menus = computed(() =>
    this.store.menus
      .value()
      .filter((menu) => menu.isActive && !menu.isArchived)
      .sort((a, b) => a.position - b.position),
  );
  /** Onglet choisi ; le premier par défaut, et de nouveau si celui-ci disparaît. */
  protected readonly tab = linkedSignal<string | undefined, string>({
    source: () => this.categories()[0]?.id ?? (this.menus().length > 0 ? MENUS_TAB : undefined),
    computation: (first, previous) =>
      previous && this.tabExists(previous.value) ? previous.value : (first ?? ''),
  });
  protected readonly products = computed(() =>
    this.store.products
      .value()
      .filter(
        (product) => product.categoryId === this.tab() && product.isActive && !product.isArchived,
      )
      .sort((a, b) => a.position - b.position),
  );
  protected readonly loading = computed(
    () => this.store.categories.isLoading() || this.store.products.isLoading(),
  );
  protected readonly loadError = computed(() => {
    const error =
      this.store.categories.error() ?? this.store.products.error() ?? this.store.menus.error();
    return error ? apiErrorMessage(error) : '';
  });
  protected readonly closed = computed(() => this.opening.state()?.status === 'Closed');

  /** Devis du panier, demandé 300 ms après le dernier changement. */
  protected readonly quote = rxResource({
    params: () => (this.cart.isEmpty() ? undefined : { lines: this.cart.cartLines() }),
    stream: ({ params }) => timer(300).pipe(switchMap(() => this.orders.quote(params))),
  });
  protected readonly quoteError = computed(() =>
    this.quote.error() ? apiErrorMessage(this.quote.error()) : '',
  );
  protected readonly lineTotals = computed(() => {
    const quote = this.quote.hasValue() ? this.quote.value() : undefined;
    return new Map((quote?.lines ?? []).map((line) => [line.index, line.lineTotalCents]));
  });
  protected readonly total = computed(() =>
    this.quote.hasValue() && !this.quote.isLoading() ? this.quote.value().totalCents : null,
  );

  private readonly details = signal({ firstName: '', note: '' });
  protected readonly detailsForm = form(this.details, (path) => {
    lengthRule(path.firstName, 64);
    lengthRule(path.note, 500);
  });
  protected readonly sending = signal(false);
  protected readonly error = signal('');
  /** Commande envoyée : numéro en grand et encaissement. */
  protected readonly placed = signal<OrderDetails | null>(null);
  private readonly editing = signal<Editing | null>(null);

  constructor() {
    this.store.categories.load();
    this.store.products.load();
    this.store.menus.load();
    this.opening.load();
  }

  protected isCustomizableLine(line: CounterLine): boolean {
    if (line.kind === 'menu') {
      return true;
    }
    const product = this.store.products.value().find((p) => p.id === line.productId);
    return !!product && isCustomizable(product);
  }

  protected labelsOf(line: CounterLine): string[] {
    return line.kind === 'product'
      ? line.customization.labels
      : line.choices.map((choice) =>
          choice.customization.labels.length > 0
            ? `${choice.productName} (${choice.customization.labels.join(', ')})`
            : choice.productName,
        );
  }

  protected addProduct(product: ProductDetails): void {
    if (requiresChoice(product)) {
      this.editing.set({ kind: 'add', product });
      this.customizer().open(product, undefined, true);
      return;
    }
    this.cart.addProduct(product);
  }

  protected addMenu(menu: MenuDetails): void {
    this.editing.set({ kind: 'addMenu', menu });
    this.composer().open(menu);
  }

  protected customize(line: CounterLine): void {
    if (line.kind === 'product') {
      const product = this.store.products.value().find((p) => p.id === line.productId);
      if (product) {
        this.editing.set({ kind: 'product', key: line.key });
        this.customizer().open(product, line.customization);
      }
      return;
    }
    const menu = this.store.menus.value().find((m) => m.id === line.menuId);
    if (menu) {
      this.editing.set({ kind: 'menu', key: line.key, menu });
      this.composer().open(menu, line.choices);
    }
  }

  protected customized(customization: Customization): void {
    const editing = this.editing();
    if (editing?.kind === 'add') {
      this.cart.addProduct(editing.product, customization);
    } else if (editing?.kind === 'product') {
      this.cart.customize(editing.key, customization);
    }
    this.editing.set(null);
  }

  protected composed(choices: MenuChoice[]): void {
    const editing = this.editing();
    if (editing?.kind === 'addMenu') {
      this.cart.addMenu(editing.menu, choices);
    } else if (editing?.kind === 'menu') {
      this.cart.replaceMenuChoices(editing.key, choices);
    }
    this.editing.set(null);
  }

  /** Un échec garde le panier et sa clé : un nouvel essai ne crée pas de doublon. */
  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    if (this.cart.isEmpty() || this.sending()) {
      return;
    }
    await submit(this.detailsForm, {
      action: async () => {
        this.error.set('');
        this.sending.set(true);
        const { firstName, note } = this.details();
        try {
          const order = await firstValueFrom(
            this.manageOrders.createCounterOrder({
              idempotencyKey: this.cart.idempotencyKey(),
              lines: this.cart.cartLines(),
              customerFirstName: firstName.trim() || null,
              customerNote: note.trim() || null,
            }),
          );
          this.placed.set(order);
          this.cart.clear();
          this.details.set({ firstName: '', note: '' });
          this.detailsForm().reset();
        } catch (error) {
          this.error.set(apiErrorMessage(error));
        } finally {
          this.sending.set(false);
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }

  protected paid(order: OrderDetails): void {
    this.placed.set(order);
  }

  /** 409 pendant l'encaissement : relire la commande. */
  protected async reloadPlaced(): Promise<void> {
    const placed = this.placed();
    if (!placed) {
      return;
    }
    try {
      this.placed.set(await firstValueFrom(this.manageOrders.get(placed.id)));
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    }
  }

  protected newOrder(): void {
    this.placed.set(null);
    this.error.set('');
  }

  private tabExists(tab: string): boolean {
    return tab === MENUS_TAB
      ? this.menus().length > 0
      : this.categories().some((category) => category.id === tab);
  }
}
