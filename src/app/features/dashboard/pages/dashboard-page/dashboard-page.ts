import { Component, computed, inject } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { RouterLink } from '@angular/router';
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
import { EurosPipe } from '../../../../shared/utils/money';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, Icon, EurosPipe],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  private readonly store = inject(StoreService);
  private readonly stats = inject(StatsService);
  private readonly opening = inject(OpeningStateService);

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
