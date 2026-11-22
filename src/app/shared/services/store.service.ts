import { inject, Service } from '@angular/core';
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
import { Cached } from './cached';

/**
 * Cache des données qui changent rarement, partagé par toute l'application.
 * Les composants lisent `value()` après `load()` ; les écritures passent par les
 * services de `shared/services/`, qui rechargent les caches concernés.
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
}
