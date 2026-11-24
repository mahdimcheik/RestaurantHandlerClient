import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { PublicStore } from '../../../../shared/services/public-store.service';
import { SiteTopbar } from '../../../../shared/ui/site-topbar/site-topbar';
import { CartSummary } from '../../components/cart-summary/cart-summary';
import { CartStore } from '../../data-access/cart.store';

/** Panier en pleine page (lien panier de la barre du haut) : le même détail que sur la carte. */
@Component({
  selector: 'app-cart-page',
  imports: [RouterLink, SiteTopbar, CartSummary],
  templateUrl: './cart-page.html',
})
export class CartPage {
  private readonly store = inject(PublicStore);
  protected readonly cart = inject(CartStore);

  constructor() {
    inject(RealtimeService).start();
    this.store.card.load();
  }
}
