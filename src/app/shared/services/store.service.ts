import { inject, Service } from '@angular/core';
import { filter, merge } from 'rxjs';
import {
  CategoriesApi,
  CategoryDetails,
  ClosureDetails,
  IngredientDetails,
  IngredientsApi,
  MenuDetails,
  MenusApi,
  OptionGroupDetails,
  OptionGroupsApi,
  OpeningRangeDto,
  ProductDetails,
  ProductsApi,
  RestaurantApi,
  RestaurantSettingsDetails,
  RoleDetails,
  RolesApi,
} from '../../core/api/generated';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { Cached } from './cached';

/**
 * Cache des données qui changent rarement, partagé par toute l'application.
 * Les composants lisent `value()` après `load()` ; les écritures passent par les
 * services de `shared/services/`, qui rechargent les caches concernés.
 * Les caches de la carte déjà demandés sont relus quand le serveur annonce un changement
 * (`AvailabilityChanged`, portée `catalog`, ex. rupture saisie sur une autre tablette) et à chaque
 * resynchronisation. Horaires, fermetures et réglages ne le sont pas : leurs formulaires suivent
 * le cache et perdraient la saisie en cours.
 */
@Service()
export class StoreService {
  private readonly categoriesApi = inject(CategoriesApi);
  private readonly productsApi = inject(ProductsApi);
  private readonly ingredientsApi = inject(IngredientsApi);
  private readonly menusApi = inject(MenusApi);
  private readonly optionGroupsApi = inject(OptionGroupsApi);
  private readonly restaurantApi = inject(RestaurantApi);
  private readonly rolesApi = inject(RolesApi);

  readonly categories = new Cached<CategoryDetails[]>(
    () => this.categoriesApi.manageCategoriesGet(),
    [],
  );
  readonly products = new Cached<ProductDetails[]>(() => this.productsApi.manageProductsGet(), []);
  readonly ingredients = new Cached<IngredientDetails[]>(
    () => this.ingredientsApi.manageIngredientsGet(),
    [],
  );
  readonly menus = new Cached<MenuDetails[]>(() => this.menusApi.manageMenusGet(), []);
  readonly optionGroups = new Cached<OptionGroupDetails[]>(
    () => this.optionGroupsApi.manageOptionGroupsGet(),
    [],
  );
  readonly openingHours = new Cached<OpeningRangeDto[]>(
    () => this.restaurantApi.manageRestaurantHoursGet(),
    [],
  );
  readonly closures = new Cached<ClosureDetails[]>(
    () => this.restaurantApi.manageRestaurantClosuresGet(),
    [],
  );
  readonly settings = new Cached<RestaurantSettingsDetails | null>(
    () => this.restaurantApi.manageRestaurantSettingsGet(),
    null,
  );
  readonly roles = new Cached<RoleDetails[]>(() => this.rolesApi.rolesAllGet(), []);

  constructor() {
    const realtime = inject(RealtimeService);
    merge(
      realtime.on('AvailabilityChanged').pipe(filter(({ scope }) => scope === 'catalog')),
      realtime.resync,
    ).subscribe(() => this.reloadCatalog());
  }

  private reloadCatalog(): void {
    this.categories.reload();
    this.products.reload();
    this.ingredients.reload();
    this.menus.reload();
    this.optionGroups.reload();
  }
}
