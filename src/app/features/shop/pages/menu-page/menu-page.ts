import { NgOptimizedImage } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { MenuChoice, MenuLine, toCartLines } from '../../../../shared/ordering/cart';
import {
  CustomizationState,
  EMPTY_STATE,
  missingGroups,
  stateOf,
  toCustomization,
} from '../../../../shared/ordering/customization';
import {
  CustomizeRequest,
  menuComplete,
  MenuSlots,
  prefilledChoices,
} from '../../../../shared/ordering/menu-slots';
import { ProductOptions } from '../../../../shared/ordering/product-options';
import { PublicStore } from '../../../../shared/services/public-store.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { EurosPipe } from '../../../../shared/utils/money';
import { CartStore } from '../../data-access/cart.store';
import { quoteOf } from '../../data-access/quote';

/**
 * Composition d'un menu (US-E04-2) : un produit par emplacement dans ses bornes, chaque produit
 * personnalisable comme sur sa fiche ; prix du menu et surcoûts par le devis du serveur.
 */
@Component({
  selector: 'app-menu-page',
  imports: [NgOptimizedImage, EurosPipe, Icon, MenuSlots, ProductOptions],
  templateUrl: './menu-page.html',
})
export class MenuPage {
  private readonly store = inject(PublicStore);
  private readonly cart = inject(CartStore);
  private readonly router = inject(Router);

  readonly id = input.required<string>();
  readonly ligne = input<string>();

  private readonly heading = viewChild<ElementRef<HTMLElement>>('editHeading');

  protected readonly menu = computed(() => this.store.menus().get(this.id()));
  protected readonly products = this.store.products;
  protected readonly replacements = this.store.replacements;
  protected readonly loading = computed(() => !this.store.card.value() && !this.store.card.error());
  protected readonly line = computed(() =>
    this.cart
      .lines()
      .find(
        (line): line is MenuLine =>
          line.kind === 'menu' && line.key === this.ligne() && line.menuId === this.id(),
      ),
  );

  protected readonly choices = linkedSignal<string, MenuChoice[]>({
    source: () => `${this.id()}|${this.ligne() ?? ''}|${this.menu() ? 1 : 0}`,
    computation: () => {
      const line = untracked(this.line);
      const menu = untracked(this.menu);
      return line ? line.choices : menu ? prefilledChoices(menu) : [];
    },
  });
  protected readonly quantity = linkedSignal<string, number>({
    source: () => `${this.id()}|${this.ligne() ?? ''}`,
    computation: () => untracked(this.line)?.quantity ?? 1,
  });

  /** Produit choisi en cours de personnalisation, et son état. */
  protected readonly editing = signal<CustomizeRequest | null>(null);
  protected readonly editState = signal<CustomizationState>(EMPTY_STATE);
  protected readonly editMissing = computed(() => {
    const editing = this.editing();
    return editing ? missingGroups(editing.product, this.editState()) : [];
  });

  protected readonly complete = computed(() => {
    const menu = this.menu();
    return !!menu && menu.isAvailable && menuComplete(menu, this.choices(), this.products());
  });
  protected readonly quote = quoteOf(() => {
    const menu = this.menu();
    if (!menu || !this.complete()) {
      return undefined;
    }
    return toCartLines([
      {
        kind: 'menu',
        key: '',
        menuId: menu.id,
        name: menu.name,
        quantity: this.quantity(),
        choices: this.choices(),
      },
    ]);
  });
  protected readonly issue = computed(() => this.quote.issues()[0]?.message ?? this.quote.error());

  constructor() {
    inject(RealtimeService).start();
    this.store.card.load();
  }

  protected customize(request: CustomizeRequest): void {
    this.editing.set(request);
    this.editState.set(request.quick ? EMPTY_STATE : stateOf(request.choice.customization));
    queueMicrotask(() => this.heading()?.nativeElement.focus());
  }

  protected applyCustomization(): void {
    const editing = this.editing();
    if (!editing || this.editMissing().length > 0) {
      return;
    }
    const names = new Map(this.replacements().map((r) => [r.id, r.name]));
    const customization = toCustomization(
      editing.product,
      this.editState(),
      (id) => names.get(id) ?? '',
    );
    this.choices.update((choices) =>
      choices.map((choice) => (choice === editing.choice ? { ...choice, customization } : choice)),
    );
    this.editing.set(null);
  }

  protected cancelCustomization(): void {
    this.editing.set(null);
  }

  protected step(delta: 1 | -1): void {
    this.quantity.update((quantity) => Math.min(99, Math.max(1, quantity + delta)));
  }

  protected async add(): Promise<void> {
    const menu = this.menu();
    if (!menu || !this.complete()) {
      return;
    }
    const line = this.line();
    if (line) {
      this.cart.replaceMenuChoices(line.key, this.choices());
      this.cart.setQuantity(line.key, this.quantity());
      await this.close();
      return;
    }
    this.cart.addMenu(menu, this.choices(), this.quantity());
    await this.close();
  }

  /** Retour à la carte, qui referme le dialogue sans la faire défiler. */
  private async close(): Promise<void> {
    await this.router.navigate(['/commander'], { scroll: 'manual' });
  }
}
