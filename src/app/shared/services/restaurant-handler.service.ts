import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { RestaurantHandlerApi } from '../../core/api/generated';

@Service()
export class RestaurantHandlerService {
  private readonly api = inject(RestaurantHandlerApi);

  version(): Observable<void> {
    return this.api.versionGet();
  }
}
