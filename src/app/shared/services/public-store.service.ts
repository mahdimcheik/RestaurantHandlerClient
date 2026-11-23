import { computed, inject, Service } from '@angular/core';
import { filter, merge } from 'rxjs';
import { PublicApi, PublicCard, RestaurantInfo } from '../../core/api/generated';
import { RealtimeService } from '../../core/realtime/realtime.service';
import {
  ComposableMenu,
  CustomizableProduct,
  fromPublicMenu,
  fromPublicProduct,
  publicReplacements,
} from '../ordering/model';
import { Cached } from './cached';

/**
 * Cache des données publiques (sans compte) : carte en ligne et informations du restaurant.
 * La carte déjà demandée est relue quand le serveur annonce un changement (`AvailabilityChanged`,
 * portée `catalog` : rupture, prix) et à chaque resynchronisation temps réel.
 */
@Service()
export class PublicStore {
  private readonly api = inject(PublicApi);
  private readonly realtime = inject(RealtimeService);

  readonly card = new Cached<PublicCard | null>(() => this.api.menuGet(), null);
  readonly info = new Cached<RestaurantInfo | null>(() => this.api.restaurantInfoGet(), null);

  /** Produits de la carte, au modèle de personnalisation, par identifiant. */
  readonly products = computed(
    () =>
      new Map<string, CustomizableProduct>(
        (this.card.value()?.categories ?? []).flatMap((category) =>
          category.products.map((product) => [product.id, fromPublicProduct(product)] as const),
        ),
      ),
  );
  readonly menus = computed(
    () =>
      new Map<string, ComposableMenu>(
        (this.card.value()?.menus ?? []).map((menu) => [menu.id, fromPublicMenu(menu)] as const),
      ),
  );
  readonly replacements = computed(() => publicReplacements(this.card.value()?.replacements ?? []));

  constructor() {
    merge(
      this.realtime.on('AvailabilityChanged').pipe(filter(({ scope }) => scope === 'catalog')),
      this.realtime.resync,
    ).subscribe(() => this.card.reload());
  }
}
