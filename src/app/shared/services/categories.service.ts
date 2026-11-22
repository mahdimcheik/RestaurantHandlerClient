import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CategoriesApi,
  CategoryDetails,
  CategoryWrite,
  ReorderRequest,
  ManageCategoriesGet$Params,
} from '../../core/api/generated';
import { refresh, toVoid, unwrap } from './api-operators';
import { StoreService } from './store.service';

@Service()
export class CategoriesService {
  private readonly api = inject(CategoriesApi);
  private readonly store = inject(StoreService);

  /** Liste à jour, hors cache (ex. avec les archivées). Pour la liste en cache : `StoreService.categories`. */
  list(params?: ManageCategoriesGet$Params): Observable<CategoryDetails[]> {
    return this.api.manageCategoriesGet(params).pipe(unwrap());
  }

  create(body: CategoryWrite): Observable<CategoryDetails> {
    return this.api.manageCategoriesPost({ body }).pipe(unwrap(), refresh(this.store.categories));
  }

  update(id: string, body: CategoryWrite): Observable<CategoryDetails> {
    return this.api
      .manageCategoriesIdPut({ id, body })
      .pipe(unwrap(), refresh(this.store.categories, this.store.products));
  }

  remove(id: string): Observable<void> {
    return this.api
      .manageCategoriesIdDelete({ id })
      .pipe(toVoid(), refresh(this.store.categories, this.store.products));
  }

  reorder(body: ReorderRequest): Observable<CategoryDetails[]> {
    return this.api
      .manageCategoriesReorderPut({ body })
      .pipe(unwrap(), refresh(this.store.categories));
  }

  uploadImage(id: string, file: Blob): Observable<CategoryDetails> {
    return this.api
      .manageCategoriesIdImagePost({ id, body: { file } })
      .pipe(unwrap(), refresh(this.store.categories));
  }
}
