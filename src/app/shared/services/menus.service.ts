import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  MenuDetails,
  MenusApi,
  MenuSlotWrite,
  MenuWrite,
  ReorderRequest,
  SlotOptionsUpdate,
  ManageMenusGet$Params,
} from '../../core/api/generated';
import { refresh, toVoid, unwrap } from './api-operators';
import { StoreService } from './store.service';

@Service()
export class MenusService {
  private readonly api = inject(MenusApi);
  private readonly store = inject(StoreService);

  /** Liste à jour, hors cache (ex. avec les archivés). Pour la liste en cache : `StoreService.menus`. */
  list(params?: ManageMenusGet$Params): Observable<MenuDetails[]> {
    return this.api.manageMenusGet(params).pipe(unwrap());
  }

  /** Détail à jour d'un menu, hors cache. */
  get(id: string): Observable<MenuDetails> {
    return this.api.manageMenusIdGet({ id }).pipe(unwrap());
  }

  create(body: MenuWrite): Observable<MenuDetails> {
    return this.api.manageMenusPost({ body }).pipe(unwrap(), refresh(this.store.menus));
  }

  update(id: string, body: MenuWrite): Observable<MenuDetails> {
    return this.api.manageMenusIdPut({ id, body }).pipe(unwrap(), refresh(this.store.menus));
  }

  remove(id: string): Observable<void> {
    return this.api.manageMenusIdDelete({ id }).pipe(toVoid(), refresh(this.store.menus));
  }

  reorder(body: ReorderRequest): Observable<MenuDetails[]> {
    return this.api.manageMenusReorderPut({ body }).pipe(unwrap(), refresh(this.store.menus));
  }

  uploadImage(id: string, file: Blob): Observable<MenuDetails> {
    return this.api
      .manageMenusIdImagePost({ id, body: { file } })
      .pipe(unwrap(), refresh(this.store.menus));
  }

  removeImage(id: string): Observable<MenuDetails> {
    return this.api.manageMenusIdImageDelete({ id }).pipe(unwrap(), refresh(this.store.menus));
  }

  addSlot(id: string, body: MenuSlotWrite): Observable<MenuDetails> {
    return this.api.manageMenusIdSlotsPost({ id, body }).pipe(unwrap(), refresh(this.store.menus));
  }

  updateSlot(id: string, slotId: string, body: MenuSlotWrite): Observable<MenuDetails> {
    return this.api
      .manageMenusIdSlotsSlotIdPut({ id, slotId, body })
      .pipe(unwrap(), refresh(this.store.menus));
  }

  removeSlot(id: string, slotId: string): Observable<MenuDetails> {
    return this.api
      .manageMenusIdSlotsSlotIdDelete({ id, slotId })
      .pipe(unwrap(), refresh(this.store.menus));
  }

  reorderSlots(id: string, body: ReorderRequest): Observable<MenuDetails> {
    return this.api
      .manageMenusIdSlotsReorderPut({ id, body })
      .pipe(unwrap(), refresh(this.store.menus));
  }

  setSlotOptions(id: string, slotId: string, body: SlotOptionsUpdate): Observable<MenuDetails> {
    return this.api
      .manageMenusIdSlotsSlotIdOptionsPut({ id, slotId, body })
      .pipe(unwrap(), refresh(this.store.menus));
  }
}
