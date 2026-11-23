import { Component, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { merge } from 'rxjs';
import { OrderChannel, OrderSummary } from '../../../../core/api/generated';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { ORDER_EVENT_NAMES } from '../../../../core/realtime/realtime-events';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { ManageOrdersService } from '../../../../shared/services/manage-orders.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import {
  channelLabel,
  FINAL_STATUSES,
  OrderStatusBadge,
} from '../../../../shared/ui/order-status/order-status';
import { EurosPipe } from '../../../../shared/utils/money';
import {
  formatLocal,
  nextDay,
  previousDay,
  restaurantDay,
  RestaurantTimePipe,
} from '../../../../shared/utils/restaurant-time';

export type OrderFilter = 'all' | 'toApprove' | 'active' | 'ready' | 'toCollect' | 'closed';

const isFinal = (order: OrderSummary) => FINAL_STATUSES.includes(order.status);

const FILTERS: Record<OrderFilter, (order: OrderSummary) => boolean> = {
  all: () => true,
  toApprove: (order) => order.status === 'AwaitingApproval',
  active: (order) => order.status === 'Confirmed' || order.status === 'InPreparation',
  ready: (order) => order.status === 'Ready',
  toCollect: (order) =>
    order.paymentChoice === 'OnSite' &&
    !order.isPaid &&
    !isFinal(order) &&
    order.status !== 'AwaitingApproval',
  closed: isFinal,
};

interface Anomaly {
  orderId: string;
  dailyNumber: number;
  issue: string | null;
}

/**
 * Commandes du jour (US-E06-2) : filtres par étape, canal et numéro, mises à jour en temps
 * réel. Les commandes à valider (US-E06-3) restent en tête et sont signalées.
 */
@Component({
  selector: 'app-orders-page',
  host: { class: 'page' },
  imports: [RouterLink, Icon, OrderStatusBadge, EurosPipe, RestaurantTimePipe],
  templateUrl: './orders-page.html',
})
export class OrdersPage {
  private readonly orders = inject(ManageOrdersService);

  protected readonly today = restaurantDay();
  protected readonly day = signal(this.today);
  protected readonly dayLabel = computed(() => formatLocal(`${this.day()}T00:00:00`));
  protected readonly filter = signal<OrderFilter>('all');
  protected readonly channel = signal<OrderChannel | null>(null);
  protected readonly number = signal('');
  protected readonly anomalies = signal<Anomaly[]>([]);

  protected readonly list = rxResource({
    params: () => ({ Date: this.day() }),
    stream: ({ params }) => this.orders.list(params),
  });
  private readonly all = computed(() => (this.list.hasValue() ? this.list.value().items : []));
  protected readonly loadError = computed(() =>
    this.list.error() ? apiErrorMessage(this.list.error()) : '',
  );

  protected readonly filters: readonly { id: OrderFilter; label: string }[] = [
    { id: 'all', label: $localize`:@@orders.filter.all:Toutes` },
    { id: 'toApprove', label: $localize`:@@order.status.awaitingApproval:À valider` },
    { id: 'active', label: $localize`:@@orders.filter.active:En cours` },
    { id: 'ready', label: $localize`:@@orders.filter.ready:Prêtes` },
    { id: 'toCollect', label: $localize`:@@orders.filter.toCollect:À encaisser` },
    { id: 'closed', label: $localize`:@@orders.filter.closed:Closes` },
  ];
  protected readonly counts = computed(() => {
    const all = this.all();
    return Object.fromEntries(
      this.filters.map(({ id }) => [id, all.filter(FILTERS[id]).length]),
    ) as Record<OrderFilter, number>;
  });

  /** À valider en tête, commandes closes en bas, sinon par heure de retrait. */
  protected readonly rows = computed(() => {
    const matches = FILTERS[this.filter()];
    const channel = this.channel();
    const number = this.number().trim();
    return this.all()
      .filter(matches)
      .filter((order) => !channel || order.channel === channel)
      .filter((order) => !number || String(order.dailyNumber).startsWith(number))
      .sort(
        (a, b) =>
          Number(b.status === 'AwaitingApproval') - Number(a.status === 'AwaitingApproval') ||
          Number(isFinal(a)) - Number(isFinal(b)) ||
          a.pickupAt.localeCompare(b.pickupAt) ||
          a.dailyNumber - b.dailyNumber,
      );
  });

  protected readonly channelLabel = channelLabel;

  constructor() {
    const realtime = inject(RealtimeService);
    merge(...ORDER_EVENT_NAMES.map((name) => realtime.on(name)), realtime.resync)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.list.reload());
    realtime
      .on('PaymentAnomaly')
      .pipe(takeUntilDestroyed())
      .subscribe((anomaly) => {
        this.anomalies.update((list) => [
          ...list.filter((a) => a.orderId !== anomaly.orderId),
          anomaly,
        ]);
        this.list.reload();
      });
  }

  protected previous(): void {
    this.day.update(previousDay);
  }

  protected next(): void {
    this.day.update(nextDay);
  }

  protected dismiss(orderId: string): void {
    this.anomalies.update((list) => list.filter((a) => a.orderId !== orderId));
  }

  protected setChannel(value: string): void {
    this.channel.set(value === 'Counter' || value === 'Online' ? value : null);
  }
}
