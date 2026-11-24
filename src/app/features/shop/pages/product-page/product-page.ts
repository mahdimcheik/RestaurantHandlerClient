import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { NO_CUSTOMIZATION, ProductLine } from '../../../../shared/ordering/cart';
import {
  CustomizationState,
  EMPTY_STATE,
  missingGroups,
  stateOf,
  toCustomization,
} from '../../../../shared/ordering/customization';
import { ProductOptions } from '../../../../shared/ordering/product-options';
import { PublicStore } from '../../../../shared/services/public-store.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { EurosPipe } from '../../../../shared/utils/money';
import { CartStore } from '../../data-access/cart.store';
import { quoteOf } from '../../data-access/quote';

/**
 * Fiche produit (US-E04-1) : retraits, remplacements au surcoût affiché, options dans leurs
 * bornes, quantité ; le prix de la ligne vient du devis du serveur à chaque choix. `ligne`
 * (paramètre d'adresse) rouvre une ligne du panier pour la modifier.
 */
@Component({
  selector: 'app-product-page',
  imports: [RouterLink, NgOptimizedImage, EurosPipe, Icon, ProductOptions],
  templateUrl: './product-page.html',
})
export class ProductPage {
  private readonly store = inject(PublicStore);
  private readonly cart = inject(CartStore);
  private readonly router = inject(Router);

  readonly id = input.required<string>();
  readonly ligne = input<string>();

  protected readonly product = computed(() => this.store.products().get(this.id()));
  protected readonly replacements = this.store.replacements;
  protected readonly loading = computed(() => !this.store.card.value() && !this.store.card.error());
  /** Ligne du panier en cours de modification. */
  protected readonly line = computed(() =>
    this.cart
      .lines()
      .find(
        (line): line is ProductLine =>
          line.kind === 'product' && line.key === this.ligne() && line.productId === this.id(),
      ),
  );

  protected readonly state = linkedSignal<string, CustomizationState>({
    source: () => `${this.id()}|${this.ligne() ?? ''}`,
    computation: () => {
      const line = untracked(this.line);
      return line ? stateOf(line.customization) : EMPTY_STATE;
    },
  });
  protected readonly quantity = linkedSignal<string, number>({
    source: () => `${this.id()}|${this.ligne() ?? ''}`,
    computation: () => untracked(this.line)?.quantity ?? 1,
  });

  protected readonly missing = computed(() => {
    const product = this.product();
    return product ? missingGroups(product, this.state()) : [];
  });
  protected readonly missingLabels = computed(() =>
    this.missing()
      .map((group) => group.label)
      .join(', '),
  );
  private readonly customization = computed(() => {
    const product = this.product();
    if (!product) {
      return NO_CUSTOMIZATION;
    }
    const names = new Map(this.replacements().map((r) => [r.id, r.name]));
    return toCustomization(product, this.state(), (id) => names.get(id) ?? '');
  });
  protected readonly canAdd = computed(
    () => !!this.product()?.isAvailable && this.missing().length === 0,
  );
  protected readonly quote = quoteOf(() => {
    const product = this.product();
    if (!product || !this.canAdd()) {
      return undefined;
    }
    const { modifications, optionChoices } = this.customization();
    return [{ productId: product.id, quantity: this.quantity(), modifications, optionChoices }];
  });
  protected readonly issue = computed(() => this.quote.issues()[0]?.message ?? this.quote.error());

  constructor() {
    inject(RealtimeService).start();
    this.store.card.load();
  }

  protected step(delta: 1 | -1): void {
    this.quantity.update((quantity) => Math.min(99, Math.max(1, quantity + delta)));
  }

  protected async add(): Promise<void> {
    const product = this.product();
    if (!product || !this.canAdd()) {
      return;
    }
    const line = this.line();
    if (line) {
      this.cart.customize(line.key, this.customization());
      this.cart.setQuantity(line.key, this.quantity());
      await this.close();
      return;
    }
    this.cart.addProduct(product, this.customization(), this.quantity());
    await this.close();
  }

  /** Retour à la carte, qui referme le dialogue sans la faire défiler. */
  private async close(): Promise<void> {
    await this.router.navigate(['/commander'], { scroll: 'manual' });
  }
}
