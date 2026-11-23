import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ManageOptionGroupsGet$Params,
  OptionGroupDetails,
  OptionGroupsApi,
  OptionGroupWrite,
} from '../../core/api/generated';
import { refresh, toVoid, unwrap } from './api-operators';
import { StoreService } from './store.service';

/** Groupes d'options partagés entre produits (pain, sauces, taille…). */
@Service()
export class OptionGroupsService {
  private readonly api = inject(OptionGroupsApi);
  private readonly store = inject(StoreService);

  /** Un groupe est recopié dans le détail de chaque produit qui le propose. */
  private readonly touched = [this.store.optionGroups, this.store.products];

  /** Liste à jour, hors cache (ex. avec les archivés). Pour la liste en cache : `StoreService.optionGroups`. */
  list(params?: ManageOptionGroupsGet$Params): Observable<OptionGroupDetails[]> {
    return this.api.manageOptionGroupsGet(params).pipe(unwrap());
  }

  get(id: string): Observable<OptionGroupDetails> {
    return this.api.manageOptionGroupsIdGet({ id }).pipe(unwrap());
  }

  create(body: OptionGroupWrite): Observable<OptionGroupDetails> {
    return this.api.manageOptionGroupsPost({ body }).pipe(unwrap(), refresh(...this.touched));
  }

  /** Remplace aussi les choix : un choix sans `id` est créé, un choix absent est archivé. */
  update(id: string, body: OptionGroupWrite): Observable<OptionGroupDetails> {
    return this.api.manageOptionGroupsIdPut({ id, body }).pipe(unwrap(), refresh(...this.touched));
  }

  /** Définitif ; refusé par le serveur tant qu'un produit propose le groupe. */
  remove(id: string): Observable<void> {
    return this.api.manageOptionGroupsIdDelete({ id }).pipe(toVoid(), refresh(...this.touched));
  }

  uploadImage(id: string, file: Blob): Observable<OptionGroupDetails> {
    return this.api
      .manageOptionGroupsIdImagePost({ id, body: { file } })
      .pipe(unwrap(), refresh(...this.touched));
  }

  uploadChoiceImage(id: string, choiceId: string, file: Blob): Observable<OptionGroupDetails> {
    return this.api
      .manageOptionGroupsIdChoicesChoiceIdImagePost({ id, choiceId, body: { file } })
      .pipe(unwrap(), refresh(...this.touched));
  }

  removeImage(id: string): Observable<OptionGroupDetails> {
    return this.api
      .manageOptionGroupsIdImageDelete({ id })
      .pipe(unwrap(), refresh(...this.touched));
  }

  removeChoiceImage(id: string, choiceId: string): Observable<OptionGroupDetails> {
    return this.api
      .manageOptionGroupsIdChoicesChoiceIdImageDelete({ id, choiceId })
      .pipe(unwrap(), refresh(...this.touched));
  }
}
