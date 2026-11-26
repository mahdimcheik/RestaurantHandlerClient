import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DOCUMENT,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { OrderDetails } from '../../../../core/api/generated';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { OrdersService } from '../../../../shared/services/orders.service';
import { PublicStore } from '../../../../shared/services/public-store.service';
import {
  ConnectionBanner,
  ConnectionStatus,
} from '../../../../shared/ui/connection-status/connection-status';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SiteTopbar } from '../../../../shared/ui/site-topbar/site-topbar';
import { FINAL_STATUSES, OrderStatusBadge } from '../../../../shared/ui/order-status/order-status';
import { CONFLICT_MESSAGE, isConflict } from '../../../../shared/utils/conflict';
import { EurosPipe } from '../../../../shared/utils/money';
import { isPaymentUrl } from '../../../../shared/utils/payment-url';
import { formatTime } from '../../../../shared/utils/restaurant-time';
import {
  awaitsOnlinePayment,
  closingReason,
  itemDetails,
  paymentText,
  showsCancelHelp,
} from '../../order-format';

/** Relecture tant que le paiement en ligne n'est pas confirmé (notification SumUp en retard). */
export const PAYMENT_POLL_MS = 5_000;

/**
 * Suivi d'une commande (US-E08-1) et adresse de retour du paiement SumUp. Relu à chaque
 * `OrderStatusChanged` de cette commande, à chaque resynchronisation (téléphone déverrouillé,
 * réseau retrouvé) et toutes les 5 s tant que le paiement en ligne est attendu : le retour du
 * navigateur ne prouve rien, seul le serveur confirme. « Prête » est annoncée et fait vibrer.
 * Pas d'annulation en ligne (ADR-0013) : le client est invité à appeler le restaurant.
 */
@Component({
  selector: 'app-tracking-page',
  host: { class: 'shop' },
  imports: [
    RouterLink,
    SiteTopbar,
    EurosPipe,
    Icon,
    OrderStatusBadge,
    ConnectionBanner,
    ConnectionStatus,
  ],
  templateUrl: './tracking-page.html',
})
export class TrackingPage {
  private readonly orders = inject(OrdersService);
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly store = inject(PublicStore);

  readonly id = input.required<string>();

  /** Téléphone du restaurant, facultatif dans les réglages. */
  protected readonly phone = computed(() => this.store.info.value()?.phone?.trim() || null);
  protected readonly phoneHref = computed(() => `tel:${(this.phone() ?? '').replace(/\s/g, '')}`);

  protected readonly order = signal<OrderDetails | null>(null);
  protected readonly loadError = signal('');
  protected readonly notFound = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected readonly ready = computed(() => this.order()?.status === 'Ready');
  protected readonly final = computed(() => {
    const order = this.order();
    return !!order && FINAL_STATUSES.includes(order.status);
  });
  protected readonly pickupTime = computed(() => {
    const order = this.order();
    return order ? formatTime(order.pickupAt) : '';
  });
  protected readonly cancelHelp = computed(() => {
    const order = this.order();
    return !!order && showsCancelHelp(order);
  });
  protected readonly awaitsPayment = computed(() => {
    const order = this.order();
    return !!order && awaitsOnlinePayment(order);
  });
  protected readonly reason = computed(() => {
    const order = this.order();
    return order ? closingReason(order) : null;
  });
  protected readonly payment = computed(() => {
    const order = this.order();
    return order ? paymentText(order) : '';
  });
  protected readonly itemDetails = itemDetails;

  constructor() {
    const realtime = inject(RealtimeService);
    realtime.start();
    this.store.info.load();

    effect(() => {
      const id = this.id();
      untracked(() => {
        this.order.set(null);
        void this.load(id);
      });
    });

    realtime
      .on('OrderStatusChanged')
      .pipe(takeUntilDestroyed())
      .subscribe((summary) => {
        if (summary.id === this.id()) {
          void this.load(this.id());
        }
      });
    realtime.resync.pipe(takeUntilDestroyed()).subscribe(() => void this.load(this.id()));

    effect((onCleanup) => {
      if (this.order()?.status !== 'PendingPayment') {
        return;
      }
      const timer = setInterval(() => void this.load(this.id()), PAYMENT_POLL_MS);
      onCleanup(() => clearInterval(timer));
    });

    // Passage à « Prête » : vibration si l'appareil le permet (US-E08-1).
    let previous: string | undefined;
    effect(() => {
      const status = this.order()?.status;
      if (status === 'Ready' && previous !== undefined && previous !== 'Ready') {
        this.window?.navigator.vibrate?.([200, 100, 200]);
      }
      previous = status;
    });
  }

  /** Nouvelle tentative de paiement en ligne : nouvelle page SumUp. */
  protected async retryPayment(): Promise<void> {
    const order = await this.act(this.orders.pay(this.id()));
    const url = order?.paymentUrl;
    if (isPaymentUrl(url)) {
      this.window?.location.assign(url);
    } else if (order) {
      this.error.set(
        'Le paiement en ligne est indisponible pour le moment. Réessayez dans quelques minutes.',
      );
    }
  }

  private async act(action: ReturnType<OrdersService['get']>): Promise<OrderDetails | null> {
    this.error.set('');
    this.busy.set(true);
    try {
      const order = await firstValueFrom(action);
      this.order.set(order);
      return order;
    } catch (error) {
      this.error.set(
        isConflict(error)
          ? `${apiErrorMessage(error)} ${CONFLICT_MESSAGE}`
          : apiErrorMessage(error),
      );
      if (isConflict(error)) {
        await this.load(this.id());
      }
      return null;
    } finally {
      this.busy.set(false);
    }
  }

  /** La dernière commande connue reste affichée si une relecture échoue. */
  private async load(id: string): Promise<void> {
    try {
      const order = await firstValueFrom(this.orders.get(id));
      if (id === this.id()) {
        this.order.set(order);
        this.loadError.set('');
        this.notFound.set(false);
      }
    } catch (error) {
      if (id !== this.id()) {
        return;
      }
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.notFound.set(true);
      } else {
        this.loadError.set(apiErrorMessage(error));
      }
    }
  }
}
