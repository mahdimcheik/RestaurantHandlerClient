import { inject, Service } from '@angular/core';
import { CartStore } from './cart.store';
import { quoteOf } from './quote';

/**
 * Devis du panier (R2), unique pour toute la commande en ligne : le bandeau, le récapitulatif et
 * la page panier lisent le même, sans demander deux fois le serveur.
 */
@Service()
export class CartQuote {
  private readonly cart = inject(CartStore);
  readonly quote = quoteOf(() => this.cart.cartLines());
}
