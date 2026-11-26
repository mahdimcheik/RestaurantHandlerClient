import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { OrdersService } from '../../../../shared/services/orders.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SiteTopbar } from '../../../../shared/ui/site-topbar/site-topbar';
import { OrderStatusBadge } from '../../../../shared/ui/order-status/order-status';
import { EurosPipe } from '../../../../shared/utils/money';
import { RestaurantDateTimePipe } from '../../../../shared/utils/restaurant-time';

export const HISTORY_PAGE_SIZE = 20;

/** Historique des commandes (US-E08-3) : la plus récente en premier, par pages de 20. */
@Component({
  selector: 'app-history-page',
  host: { class: 'shop' },
  imports: [RouterLink, SiteTopbar, EurosPipe, RestaurantDateTimePipe, OrderStatusBadge, Icon],
  templateUrl: './history-page.html',
})
export class HistoryPage {
  private readonly orders = inject(OrdersService);

  protected readonly page = signal(1);
  protected readonly result = rxResource({
    params: () => this.page(),
    stream: ({ params }) => this.orders.mine(params, HISTORY_PAGE_SIZE),
  });
  protected readonly items = computed(() =>
    this.result.hasValue() ? this.result.value().items : [],
  );
  protected readonly pages = computed(() =>
    this.result.hasValue()
      ? Math.max(1, Math.ceil(this.result.value().count / HISTORY_PAGE_SIZE))
      : 1,
  );
  protected readonly error = computed(() =>
    this.result.error() ? apiErrorMessage(this.result.error()) : '',
  );
}
