import { Component } from '@angular/core';
import { CartSummary } from '../cart-summary/cart-summary';

/** Colonne « Votre commande » du grand écran, collée à droite de la carte. */
@Component({
  selector: 'app-order-aside',
  imports: [CartSummary],
  host: {
    class: 'order-panel order-aside',
    role: 'complementary',
    'aria-labelledby': 'order-aside-title',
  },
  template: `
    <h2 id="order-aside-title" class="eyebrow">Votre commande</h2>
    <app-cart-summary />
  `,
})
export class OrderAside {}
