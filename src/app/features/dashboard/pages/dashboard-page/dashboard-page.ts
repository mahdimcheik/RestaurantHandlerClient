import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/http/api-error';
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
  protected readonly optionGroupCount = computed(() => this.store.optionGroups.value().length);

  constructor() {
    this.store.categories.load();
    this.store.products.load();
    this.store.optionGroups.load();
  }
}
