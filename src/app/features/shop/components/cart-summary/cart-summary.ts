import { Component, computed, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderLine } from '../../../../shared/ordering/cart';
import { Icon } from '../../../../shared/ui/icon/icon';
import { EurosPipe, RatePipe } from '../../../../shared/utils/money';
import { CartQuote } from '../../data-access/cart-quote';
import { CartStore } from '../../data-access/cart.store';

/**
 * Détail de la commande en cours (US-E04-1) : lignes, quantités, retouche et retrait ; total et
 * TVA par le devis du serveur (R2), lignes refusées signalées une à une. Affiché à droite de la
 * carte sur grand écran, dans une feuille sur téléphone, et sur la page panier.
 */
@Component({
  selector: 'app-cart-summary',
  imports: [RouterLink, EurosPipe, RatePipe, Icon],
  templateUrl: './cart-summary.html',
  host: { class: 'cart-summary' },
})
export class CartSummary {
  protected readonly cart = inject(CartStore);
  protected readonly quote = inject(CartQuote).quote;
  protected readonly labelsOf = (line: OrderLine) => this.cart.labelsOf(line);

  /** Le client quitte le récapitulatif (modifier une ligne, valider) : la feuille se referme. */
  readonly navigated = output<void>();

  /** Refus du devis en cours, sinon ceux de la dernière validation, sinon les ruptures connues. */
  private readonly issues = computed(() => {
    for (const issues of [this.quote.issues(), this.cart.issues(), this.cart.unavailable()]) {
      if (issues.length > 0) {
        return issues;
      }
    }
    return [];
  });
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

  protected editLink(line: OrderLine): string[] {
    return line.kind === 'product'
      ? ['/commander/produit', line.productId]
      : ['/commander/menu', line.menuId];
  }
}
