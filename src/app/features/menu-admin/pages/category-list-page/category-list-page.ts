import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { CategoriesService } from '../../../../shared/services/categories.service';
import { StoreService } from '../../../../shared/services/store.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { StatusBadges } from '../../components/status-badges';

@Component({
  selector: 'app-category-list-page',
  imports: [RouterLink, Icon, StatusBadges],
  templateUrl: './category-list-page.html',
})
export class CategoryListPage {
  private readonly store = inject(StoreService);
  private readonly categories = inject(CategoriesService);

  protected readonly showArchived = signal(false);
  private readonly withArchived = rxResource({
    params: () => (this.showArchived() ? true : undefined),
    stream: () => this.categories.list({ includeArchived: true }),
  });

  protected readonly rows = computed(() =>
    this.showArchived() ? (this.withArchived.value() ?? []) : this.store.categories.value(),
  );
  protected readonly loading = computed(() =>
    this.showArchived() ? this.withArchived.isLoading() : this.store.categories.isLoading(),
  );
  protected readonly error = computed(() => {
    const error = this.showArchived() ? this.withArchived.error() : this.store.categories.error();
    return error ? apiErrorMessage(error) : '';
  });

  constructor() {
    this.store.categories.load();
  }
}
