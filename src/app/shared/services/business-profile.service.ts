import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  BusinessProfileApi,
  BusinessProfileDetails,
  BusinessProfileUpsert,
} from '../../core/api/generated';
import { toVoid, unwrap } from './api-operators';

/** Profil professionnel du client connecté (SIREN, raison sociale, adresse de facturation). */
@Service()
export class BusinessProfileService {
  private readonly api = inject(BusinessProfileApi);

  /** `null` si le client n'est pas professionnel. */
  mine(): Observable<BusinessProfileDetails | null> {
    return this.api.usersMeBusinessProfileGet().pipe(map((response) => response.data ?? null));
  }

  save(body: BusinessProfileUpsert): Observable<BusinessProfileDetails> {
    return this.api.usersMeBusinessProfilePut({ body }).pipe(unwrap());
  }

  remove(): Observable<void> {
    return this.api.usersMeBusinessProfileDelete().pipe(toVoid());
  }
}
