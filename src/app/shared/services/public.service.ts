import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  OpeningStateDto,
  PickupSlotDto,
  PublicApi,
  PublicCard,
  RestaurantInfo,
} from '../../core/api/generated';
import { unwrap } from './api-operators';

/** Routes publiques (sans compte) : carte, état d'ouverture, créneaux, infos. */
@Service()
export class PublicService {
  private readonly api = inject(PublicApi);

  card(): Observable<PublicCard> {
    return this.api.menuGet().pipe(unwrap());
  }

  status(): Observable<OpeningStateDto> {
    return this.api.restaurantStatusGet().pipe(unwrap());
  }

  slots(): Observable<PickupSlotDto[]> {
    return this.api.restaurantSlotsGet().pipe(unwrap());
  }

  info(): Observable<RestaurantInfo> {
    return this.api.restaurantInfoGet().pipe(unwrap());
  }
}
