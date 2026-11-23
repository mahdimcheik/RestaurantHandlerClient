import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProductDetails } from '../../../../core/api/generated';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { ProductsService } from '../../../../shared/services/products.service';
import { StoreService } from '../../../../shared/services/store.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { EurosPipe } from '../../../../shared/utils/money';
import { MoveButtons } from '../../components/move-buttons';
import { StatusBadges } from '../../components/status-badges';
import { ListOrder } from '../../reorder';

@Component({
  selector: 'app-product-list-page',
  imports: [RouterLink, Icon, StatusBadges, MoveButtons, EurosPipe],
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

  /** L'API ordonne les produits par catégorie : l'ordre se change une catégorie filtrée. */
  protected readonly canReorder = computed(() => this.categoryId() !== '' && !this.showArchived());
  protected readonly order = new ListOrder(
    (orderedIds) => this.products.reorder({ orderedIds }, this.categoryId()),
    () => this.store.products.reload(),
  );

  protected readonly actionError = signal('');
  protected readonly notice = signal('');
  /** Produit en cours de bascule de rupture, pour désactiver son bouton. */
  protected readonly busyId = signal<string | null>(null);

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

  protected async toggleAvailability(product: ProductDetails): Promise<void> {
    this.actionError.set('');
    this.notice.set('');
    this.busyId.set(product.id);
    try {
      await firstValueFrom(
        this.products.setAvailability(product.id, { isAvailable: !product.isAvailable }),
      );
      this.notice.set(
        product.isAvailable
          ? $localize`:@@product.markedOut:« ${product.name}:name: » est en rupture.`
          : $localize`:@@product.markedIn:« ${product.name}:name: » est de nouveau disponible.`,
      );
    } catch (error) {
      this.actionError.set(apiErrorMessage(error));
    } finally {
      this.busyId.set(null);
    }
  }
}
