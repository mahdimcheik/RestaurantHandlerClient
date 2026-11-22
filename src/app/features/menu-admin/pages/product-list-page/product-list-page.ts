import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { ProductsService } from '../../../../shared/services/products.service';
import { StoreService } from '../../../../shared/services/store.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { EurosPipe } from '../../../../shared/utils/money';
import { StatusBadges } from '../../components/status-badges';

@Component({
  selector: 'app-product-list-page',
  imports: [RouterLink, Icon, StatusBadges, EurosPipe],
  templateUrl: './product-list-page.html',
})
export class ProductListPage {
  /** Filtre `?categorie=` de l'URL. */
  readonly categorie = input<string>();

  private readonly store = inject(StoreService);
  private readonly products = inject(ProductsService);
  private readonly router = inject(Router);

  protected readonly categoryId = linkedSignal(() => this.categorie() ?? '');
  protected readonly showArchived = signal(false);
  private readonly withArchived = rxResource({
    params: () => (this.showArchived() ? true : undefined),
    stream: () => this.products.list({ includeArchived: true }),
  });

  protected readonly categories = this.store.categories.value;
  private readonly categoryNames = computed(
    () => new Map(this.store.categories.value().map((category) => [category.id, category.name])),
  );

  protected readonly rows = computed(() => {
    const all = this.showArchived()
      ? (this.withArchived.value() ?? [])
      : this.store.products.value();
    const categoryId = this.categoryId();
    return all
      .filter((product) => !categoryId || product.categoryId === categoryId)
      .map((product) => ({
        ...product,
        categoryName: this.categoryNames().get(product.categoryId) ?? '',
      }));
  });
  protected readonly loading = computed(() =>
    this.showArchived() ? this.withArchived.isLoading() : this.store.products.isLoading(),
  );
  protected readonly error = computed(() => {
    const error = this.showArchived() ? this.withArchived.error() : this.store.products.error();
    return error ? apiErrorMessage(error) : '';
  });

  constructor() {
    this.store.products.load();
    this.store.categories.load();
  }

  protected filter(categoryId: string): void {
    this.categoryId.set(categoryId);
    void this.router.navigate([], {
      queryParams: { categorie: categoryId || null },
      replaceUrl: true,
    });
  }
}
