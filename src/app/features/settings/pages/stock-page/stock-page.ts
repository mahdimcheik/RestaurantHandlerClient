import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { IngredientsService } from '../../../../shared/services/ingredients.service';
import { ProductsService } from '../../../../shared/services/products.service';
import { StoreService } from '../../../../shared/services/store.service';

/** Article dont on déclare la rupture : produit ou ingrédient. */
interface StockItem {
  id: string;
  name: string;
  isAvailable: boolean;
}

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Écran « Ruptures » pour le service : produits et ingrédients, une touche par article.
 * Le serveur décide des conséquences (un ingrédient non retirable rend ses produits indisponibles).
 */
@Component({
  selector: 'app-stock-page',
  imports: [NgTemplateOutlet],
  templateUrl: './stock-page.html',
})
export class StockPage {
  private readonly store = inject(StoreService);
  private readonly products = inject(ProductsService);
  private readonly ingredients = inject(IngredientsService);

  protected readonly query = signal('');
  protected readonly onlyOut = signal(false);

  private readonly matches = computed(() => {
    const query = normalize(this.query());
    const onlyOut = this.onlyOut();
    return (item: StockItem) =>
      (!onlyOut || !item.isAvailable) && (!query || normalize(item.name).includes(query));
  });

  protected readonly productRows = computed(() =>
    this.store.products
      .value()
      .filter((product) => product.isActive && !product.isArchived)
      .filter(this.matches()),
  );
  protected readonly ingredientRows = computed(() =>
    this.store.ingredients
      .value()
      .filter((ingredient) => !ingredient.isArchived)
      .filter(this.matches()),
  );
  protected readonly outCount = computed(
    () =>
      this.store.products.value().filter((p) => p.isActive && !p.isArchived && !p.isAvailable)
        .length +
      this.store.ingredients.value().filter((i) => !i.isArchived && !i.isAvailable).length,
  );

  protected readonly loading = computed(
    () => this.store.products.isLoading() || this.store.ingredients.isLoading(),
  );
  protected readonly loadError = computed(() => {
    const error = this.store.products.error() ?? this.store.ingredients.error();
    return error ? apiErrorMessage(error) : '';
  });

  protected readonly error = signal('');
  protected readonly notice = signal('');
  /** Article en cours de bascule, pour désactiver sa touche. */
  protected readonly busyId = signal<string | null>(null);

  constructor() {
    this.store.products.load();
    this.store.ingredients.load();
  }

  protected toggleProduct(product: StockItem): Promise<void> {
    return this.toggle(
      product,
      this.products.setAvailability(product.id, { isAvailable: !product.isAvailable }),
    );
  }

  protected toggleIngredient(ingredient: StockItem): Promise<void> {
    return this.toggle(
      ingredient,
      this.ingredients.setAvailability(ingredient.id, { isAvailable: !ingredient.isAvailable }),
    );
  }

  private async toggle(item: StockItem, action: Observable<unknown>): Promise<void> {
    this.error.set('');
    this.notice.set('');
    this.busyId.set(item.id);
    try {
      await firstValueFrom(action);
      this.notice.set(
        item.isAvailable
          ? `« ${item.name} » est en rupture.`
          : `« ${item.name} » est de nouveau disponible.`,
      );
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.busyId.set(null);
    }
  }
}
