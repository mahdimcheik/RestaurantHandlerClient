import { computed, effect, inject, Service } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { SessionService } from '../../core/auth/session.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { OrdersService } from './orders.service';

/**
 * Commandes en cours du client connecté (US-E08-2), pour le bandeau affiché sur toutes les pages.
 * Rien n'est demandé sans session client ; relues à chaque changement de statut poussé par le
 * serveur et à chaque resynchronisation (téléphone déverrouillé, réseau retrouvé).
 */
@Service()
export class CurrentOrderService {
  private readonly session = inject(SessionService);
  private readonly orders = inject(OrdersService);
  private readonly realtime = inject(RealtimeService);

  private readonly customerId = computed(() =>
    this.session.isManager() ? undefined : this.session.user()?.id,
  );
  private readonly resource = rxResource({
    params: () => this.customerId(),
    stream: () => this.orders.mineCurrent(),
  });

  /** Commandes en cours, la plus récente en premier ; vide sans session client. */
  readonly current = computed(() =>
    this.customerId() && this.resource.hasValue() ? this.resource.value() : [],
  );

  constructor() {
    effect(() => {
      if (this.customerId()) {
        this.realtime.start();
      }
    });
    merge(
      this.realtime.on('OrderStatusChanged'),
      this.realtime.on('OrderUpdated'),
      this.realtime.resync,
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (this.customerId()) {
          this.resource.reload();
        }
      });
  }
}
