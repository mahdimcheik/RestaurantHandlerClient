import { Component, inject, input, output } from '@angular/core';
import { Icon } from '../../../../shared/ui/icon/icon';
import { EurosPipe } from '../../../../shared/utils/money';
import { CartQuote } from '../../data-access/cart-quote';
import { CartStore } from '../../data-access/cart.store';

/** Bandeau du bas (téléphone) : nombre d'articles et total du devis ; ouvre le détail. */
@Component({
  selector: 'app-order-bar',
  imports: [Icon, EurosPipe],
  host: { class: 'order-bar' },
  template: `
    <button
      type="button"
      class="btn-brand btn-brand--solid order-bar__button"
      aria-haspopup="dialog"
      [attr.aria-expanded]="expanded()"
      (click)="opened.emit()"
    >
      <app-icon name="bag" />
      <span class="visually-hidden">Voir ma commande :</span>
      <span class="order-bar__count">
        @if (cart.itemCount() === 1) {
          1 article
        } @else {
          {{ cart.itemCount() }} articles
        }
      </span>
      <span class="order-bar__total">
        @if (quote.total() === null) {
          Calcul…
        } @else {
          {{ quote.total() | euros }}
        }
      </span>
      <app-icon name="up" />
    </button>
  `,
})
export class OrderBar {
  protected readonly cart = inject(CartStore);
  protected readonly quote = inject(CartQuote).quote;

  /** Détail de la commande ouvert. */
  readonly expanded = input(false);
  readonly opened = output<void>();
}
