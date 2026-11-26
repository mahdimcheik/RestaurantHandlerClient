import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { filter, firstValueFrom, interval, map, merge, Observable } from 'rxjs';
import { OrderDetails } from '../../../../core/api/generated';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { ORDER_EVENT_NAMES } from '../../../../core/realtime/realtime-events';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { ManageOrdersService } from '../../../../shared/services/manage-orders.service';
import { StoreService } from '../../../../shared/services/store.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import {
  OrderStatusBadge,
  paymentMethodLabel,
  paymentStatusLabel,
  statusLabel,
} from '../../../../shared/ui/order-status/order-status';
import { EurosPipe, RatePipe } from '../../../../shared/utils/money';
import {
  RestaurantDateTimePipe,
  RestaurantTimePipe,
} from '../../../../shared/utils/restaurant-time';
import { ReasonDialog } from '../../../../shared/ui/reason-dialog/reason-dialog';
import { CONFLICT_MESSAGE, isConflict } from '../../../../shared/utils/conflict';
import { availableActions } from '../../../../shared/ordering/order-actions';

/**
 * Détail d'une commande et gestes du restaurant : remettre (US-E06-4), client non venu
 * (US-E06-5), annuler à la demande du client (US-E06-6), rembourser (US-E05-4). Les boutons
 * suivent le statut ; le serveur tranche, un 409 relit la commande.
 */
@Component({
  selector: 'app-order-page',
  host: { class: 'page' },
  imports: [
    RouterLink,
    OrderStatusBadge,
    EurosPipe,
    RatePipe,
    RestaurantTimePipe,
    RestaurantDateTimePipe,
    ReasonDialog,
    ConfirmDialog,
  ],
  templateUrl: './order-page.html',
})
export class OrderPage {
  private readonly orders = inject(ManageOrdersService);
  private readonly store = inject(StoreService);

  readonly id = input.required<string>();

  private readonly resource = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.orders.get(id),
  });
  /** Dernière version connue : relue, ou renvoyée par un geste. */
  protected readonly order = linkedSignal<OrderDetails | undefined>(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );
  protected readonly loading = this.resource.isLoading;
  protected readonly loadError = computed(() =>
    this.resource.error() ? apiErrorMessage(this.resource.error()) : '',
  );

  /** Horloge à la minute, pour faire apparaître « client non venu » sans recharger. */
  private readonly now = signal(Date.now());
  protected readonly actions = computed(() => {
    const order = this.order();
    const grace = this.store.settings.value()?.pickupGraceMinutes ?? 0;
    return order ? availableActions(order, this.now(), grace) : null;
  });

  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  protected readonly methodLabel = paymentMethodLabel;
  protected readonly statusLabel = statusLabel;
  protected readonly paymentStatusLabel = paymentStatusLabel;

  constructor() {
    this.store.settings.load();
    interval(60_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.now.set(Date.now()));

    const realtime = inject(RealtimeService);
    merge(
      ...ORDER_EVENT_NAMES.map((name) => realtime.on(name).pipe(map((order) => order.id))),
      realtime.on('PaymentAnomaly').pipe(map((anomaly) => anomaly.orderId)),
    )
      .pipe(
        filter((id) => id === this.id()),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.resource.reload());
    realtime.resync.pipe(takeUntilDestroyed()).subscribe(() => this.resource.reload());
  }

  protected complete(): Promise<void> {
    return this.run((id) => this.orders.complete(id), 'Commande remise au client.');
  }

  protected noShow(): Promise<void> {
    return this.run((id) => this.orders.markNoShow(id), 'Client déclaré non venu.');
  }

  protected cancel(reason: string): Promise<void> {
    return this.run((id) => this.orders.cancel(id, { reason }), 'Commande annulée.');
  }

  protected refund(): Promise<void> {
    return this.run((id) => this.orders.refund(id), 'Remboursement demandé.');
  }

  private async run(
    action: (id: string) => Observable<OrderDetails>,
    success: string,
  ): Promise<void> {
    this.error.set('');
    this.notice.set('');
    this.busy.set(true);
    try {
      this.order.set(await firstValueFrom(action(this.id())));
      this.notice.set(success);
    } catch (error) {
      if (isConflict(error)) {
        this.resource.reload();
        this.error.set(`${CONFLICT_MESSAGE} ${apiErrorMessage(error)}`);
      } else {
        this.error.set(apiErrorMessage(error));
      }
    } finally {
      this.busy.set(false);
    }
  }
}
