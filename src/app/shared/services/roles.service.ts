import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { RoleDetails, RolesApi } from '../../core/api/generated';
import { unwrap } from './api-operators';

/** Pour la liste en cache, lire `StoreService.roles`. */
@Service()
export class RolesService {
  private readonly api = inject(RolesApi);

  /** Liste à jour, hors cache. */
  list(): Observable<RoleDetails[]> {
    return this.api.rolesAllGet().pipe(unwrap());
  }
}
