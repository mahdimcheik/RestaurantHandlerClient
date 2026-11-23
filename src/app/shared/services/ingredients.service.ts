import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AvailabilityUpdate,
  IngredientDetails,
  IngredientsApi,
  IngredientWrite,
  ManageIngredientsGet$Params,
} from '../../core/api/generated';
import { refresh, toVoid, unwrap } from './api-operators';
import { StoreService } from './store.service';

@Service()
export class IngredientsService {
  private readonly api = inject(IngredientsApi);
  private readonly store = inject(StoreService);

  /** Liste à jour, hors cache (ex. avec les archivés). Pour la liste en cache : `StoreService.ingredients`. */
  list(params?: ManageIngredientsGet$Params): Observable<IngredientDetails[]> {
    return this.api.manageIngredientsGet(params).pipe(unwrap());
  }

  /** La composition et la disponibilité des produits dépendent des ingrédients. */
  private readonly touched = [this.store.ingredients, this.store.products];

  create(body: IngredientWrite): Observable<IngredientDetails> {
    return this.api.manageIngredientsPost({ body }).pipe(unwrap(), refresh(this.store.ingredients));
  }

  update(id: string, body: IngredientWrite): Observable<IngredientDetails> {
    return this.api.manageIngredientsIdPut({ id, body }).pipe(unwrap(), refresh(...this.touched));
  }

  remove(id: string): Observable<void> {
    return this.api.manageIngredientsIdDelete({ id }).pipe(toVoid(), refresh(...this.touched));
  }

  setAvailability(id: string, body: AvailabilityUpdate): Observable<IngredientDetails> {
    return this.api
      .manageIngredientsIdAvailabilityPut({ id, body })
      .pipe(unwrap(), refresh(...this.touched));
  }

  uploadImage(id: string, file: Blob): Observable<IngredientDetails> {
    return this.api
      .manageIngredientsIdImagePost({ id, body: { file } })
      .pipe(unwrap(), refresh(...this.touched));
  }

  removeImage(id: string): Observable<IngredientDetails> {
    return this.api.manageIngredientsIdImageDelete({ id }).pipe(unwrap(), refresh(...this.touched));
  }
}
