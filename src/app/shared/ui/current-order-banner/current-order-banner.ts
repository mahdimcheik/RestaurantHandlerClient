import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrentOrderService } from '../../services/current-order.service';
import { Icon } from '../icon/icon';
import { customerStatusLabel } from '../order-status/order-status';

/** « Commande n° 42 — En préparation » sur toutes les pages tant qu'une commande est en cours. */
@Component({
  selector: 'app-current-order-banner',
  imports: [RouterLink, Icon],
  template: `
    @for (order of current.current(); track order.id) {
      <a
        class="current-order gutter"
        [class.current-order--ready]="order.status === 'Ready'"
        [routerLink]="['/commandes', order.id]"
      >
        <app-icon [name]="order.status === 'Ready' ? 'bell' : 'orders'" />
        <span i18n="@@currentOrder.text"
          >Commande n° {{ order.dailyNumber }} — {{ label(order.status) }}</span
        >
        <app-icon name="forward" />
      </a>
    }
  `,
})
export class CurrentOrderBanner {
  protected readonly current = inject(CurrentOrderService);
  protected readonly label = customerStatusLabel;
}
