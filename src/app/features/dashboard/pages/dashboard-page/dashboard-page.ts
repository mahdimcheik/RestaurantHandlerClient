import { Component, computed, inject } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { RouterLink } from '@angular/router';
import { OrderStatus } from '../../../../core/api/generated';
import { SessionService } from '../../../../core/auth/session.service';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { ORDER_EVENT_NAMES } from '../../../../core/realtime/realtime-events';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import {
  describeOpening,
  OpeningStateService,
} from '../../../../shared/services/opening-state.service';
import { StatsService } from '../../../../shared/services/stats.service';
import { StoreService } from '../../../../shared/services/store.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { statusLabel } from '../../../../shared/ui/order-status/order-status';
import { EurosPipe } from '../../../../shared/utils/money';

/** Compteurs opérationnels du jour, dans l'ordre du service. */
const COUNTED_STATUSES: readonly OrderStatus[] = [
  'PendingPayment',
  'AwaitingApproval',
  'Confirmed',
  'InPreparation',
  'Ready',
  'Refused',
  'NoShow',
  'Cancelled',
];

const percent = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const longDate = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, Icon, EurosPipe],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  private readonly store = inject(StoreService);
  private readonly stats = inject(StatsService);
  private readonly opening = inject(OpeningStateService);

  private readonly session = inject(SessionService);

  protected readonly firstName = computed(() => this.session.user()?.firstName ?? '');
  /** Date du jour en toutes lettres, sur l'horloge de l'appareil (« Mardi 24 novembre 2026 »). */
  protected readonly todayLabel = capitalize(longDate.format(new Date()));

  /** État d'ouverture en une phrase ; vide tant qu'il n'est pas connu. */
  protected readonly openingLabel = computed(() => {
    const state = this.opening.state();
    return state ? describeOpening(state) : '';
  });
  protected readonly openingReason = computed(() => this.opening.state()?.closureReason ?? '');

  /** Chiffres du jour (date du restaurant, choisie par le serveur). */
  protected readonly today = rxResource({ stream: () => this.stats.dashboard() });
  protected readonly todayError = computed(() =>
    this.today.error() ? apiErrorMessage(this.today.error()) : '',
  );

  protected readonly statusCounts = computed(() => {
    const byStatus = this.today.hasValue() ? this.today.value().byStatus : {};
    return COUNTED_STATUSES.map((status) => ({
      status,
      label: statusLabel(status),
      count: byStatus[status] ?? 0,
    }));
  });

  protected vatRate(rate: number): string {
    return `${percent.format(rate)} %`;
  }

  protected readonly categoryCount = computed(() => this.store.categories.value().length);
  protected readonly activeProductCount = computed(
    () => this.store.products.value().filter((product) => product.isActive).length,
  );
  protected readonly outOfStockCount = computed(
    () =>
      this.store.products.value().filter((product) => product.isActive && !product.isAvailable)
        .length,
  );
  protected readonly activeMenuCount = computed(
    () => this.store.menus.value().filter((menu) => menu.isActive).length,
  );
  protected readonly optionGroupCount = computed(() => this.store.optionGroups.value().length);
  protected readonly outOfStockIngredientCount = computed(
    () => this.store.ingredients.value().filter((ingredient) => !ingredient.isAvailable).length,
  );

  constructor() {
    this.store.categories.load();
    this.store.products.load();
    this.store.menus.load();
    this.store.optionGroups.load();
    this.store.ingredients.load();
    this.opening.load();

    // Chiffres du jour relus à chaque commande reçue ou modifiée, et après une coupure.
    const realtime = inject(RealtimeService);
    merge(...ORDER_EVENT_NAMES.map((name) => realtime.on(name)), realtime.resync)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.today.reload());
  }
}
