import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AvailabilityUpdate,
  CompositionUpdate,
  OptionGroupsUpdate,
  ProductDetails,
  ProductsApi,
  ProductWrite,
  ReorderRequest,
  ManageProductsGet$Params,
} from '../../core/api/generated';
import { refresh, toVoid, unwrap } from './api-operators';
import { StoreService } from './store.service';

@Service()
export class ProductsService {
  private readonly api = inject(ProductsApi);
  private readonly store = inject(StoreService);

  /** Liste à jour, hors cache (filtre par catégorie, archivés). Pour la liste en cache : `StoreService.products`. */
  list(params?: ManageProductsGet$Params): Observable<ProductDetails[]> {
    return this.api.manageProductsGet(params).pipe(unwrap());
  }

  /** Les catégories comptent les produits actifs et les menus affichent leur nom. */
  private readonly touched = [this.store.products, this.store.categories, this.store.menus];

  /** Détail à jour d'un produit, hors cache. */
  get(id: string): Observable<ProductDetails> {
    return this.api.manageProductsIdGet({ id }).pipe(unwrap());
  }

  create(body: ProductWrite): Observable<ProductDetails> {
    return this.api.manageProductsPost({ body }).pipe(unwrap(), refresh(...this.touched));
  }

  update(id: string, body: ProductWrite): Observable<ProductDetails> {
    return this.api.manageProductsIdPut({ id, body }).pipe(unwrap(), refresh(...this.touched));
  }

  remove(id: string): Observable<void> {
    return this.api.manageProductsIdDelete({ id }).pipe(toVoid(), refresh(...this.touched));
  }

  reorder(body: ReorderRequest, categoryId?: string): Observable<ProductDetails[]> {
    return this.api
      .manageProductsReorderPut({ body, categoryId })
      .pipe(unwrap(), refresh(this.store.products));
  }

  setAvailability(id: string, body: AvailabilityUpdate): Observable<ProductDetails> {
    return this.api
      .manageProductsIdAvailabilityPut({ id, body })
      .pipe(unwrap(), refresh(...this.touched));
  }

  setComposition(id: string, body: CompositionUpdate): Observable<ProductDetails> {
    return this.api
      .manageProductsIdCompositionPut({ id, body })
      .pipe(unwrap(), refresh(this.store.products));
  }

  setOptionGroups(id: string, body: OptionGroupsUpdate): Observable<ProductDetails> {
    return this.api
      .manageProductsIdOptionGroupsPut({ id, body })
      .pipe(unwrap(), refresh(this.store.products));
  }

  uploadImage(id: string, file: Blob): Observable<ProductDetails> {
    return this.api
      .manageProductsIdImagePost({ id, body: { file } })
      .pipe(unwrap(), refresh(this.store.products));
  }
}
