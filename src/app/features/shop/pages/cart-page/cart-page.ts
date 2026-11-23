import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { lineLabels, OrderLine } from '../../../../shared/ordering/cart';
import { PublicStore } from '../../../../shared/services/public-store.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { EurosPipe, RatePipe } from '../../../../shared/utils/money';
import { CartStore } from '../../data-access/cart.store';
import { quoteOf } from '../../data-access/quote';

/**
 * Panier (US-E04-1) : lignes, quantités, retouche et retrait ; total et TVA par le devis du
 * serveur (R2). Les lignes refusées (rupture, prix changé) sont signalées une à une.
 */
@Component({
  selector: 'app-cart-page',
  host: { class: 'shop' },
  imports: [RouterLink, EurosPipe, RatePipe, Icon],
  templateUrl: './cart-page.html',
})
export class CartPage {
  private readonly store = inject(PublicStore);
  protected readonly cart = inject(CartStore);

  protected readonly quote = quoteOf(() => this.cart.cartLines());
  protected readonly labelsOf = lineLabels;

  /** Refus du devis en cours, sinon ceux de la dernière validation. */
  private readonly issues = computed(() =>
    this.quote.issues().length > 0 ? this.quote.issues() : this.cart.issues(),
  );
  protected readonly lineIssues = computed(() => {
    const byLine = new Map<number, string[]>();
    for (const issue of this.issues()) {
      byLine.set(issue.lineIndex, [...(byLine.get(issue.lineIndex) ?? []), issue.message]);
    }
    return byLine;
  });
  protected readonly cartIssues = computed(() => this.lineIssues().get(-1) ?? []);
  protected readonly blocked = computed(() => this.issues().length > 0);
  protected readonly quoteError = computed(() =>
    this.issues().length === 0 ? this.quote.error() : '',
  );

  constructor() {
    inject(RealtimeService).start();
    this.store.card.load();
  }

  protected editLink(line: OrderLine): string[] {
    return line.kind === 'product'
      ? ['/commander/produit', line.productId]
      : ['/commander/menu', line.menuId];
  }
}
