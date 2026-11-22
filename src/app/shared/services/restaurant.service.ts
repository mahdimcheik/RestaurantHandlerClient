import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ClosureDetails,
  ClosureWrite,
  OpeningRangeDto,
  RestaurantApi,
  RestaurantSettingsDetails,
  RestaurantSettingsWrite,
  WeekHoursUpdate,
  OpeningStateDto,
  PauseRequest,
  RestaurantSettingsHistoryItem,
} from '../../core/api/generated';
import { refresh, toVoid, unwrap } from './api-operators';
import { StoreService } from './store.service';

/**
 * Horaires, fermetures et réglages (en cache dans `StoreService`) ; pause et reprise
 * du service, dont l'état change souvent et n'est pas mis en cache.
 */
@Service()
export class RestaurantService {
  private readonly api = inject(RestaurantApi);
  private readonly store = inject(StoreService);

  updateOpeningHours(body: WeekHoursUpdate): Observable<OpeningRangeDto[]> {
    return this.api
      .manageRestaurantHoursPut({ body })
      .pipe(unwrap(), refresh(this.store.openingHours));
  }

  addClosure(body: ClosureWrite): Observable<ClosureDetails> {
    return this.api
      .manageRestaurantClosuresPost({ body })
      .pipe(unwrap(), refresh(this.store.closures));
  }

  removeClosure(id: string): Observable<void> {
    return this.api
      .manageRestaurantClosuresIdDelete({ id })
      .pipe(toVoid(), refresh(this.store.closures));
  }

  updateSettings(body: RestaurantSettingsWrite): Observable<RestaurantSettingsDetails> {
    return this.api
      .manageRestaurantSettingsPut({ body })
      .pipe(unwrap(), refresh(this.store.settings));
  }

  uploadLogo(file: Blob): Observable<RestaurantSettingsDetails> {
    return this.api
      .manageRestaurantSettingsLogoPost({ body: { file } })
      .pipe(unwrap(), refresh(this.store.settings));
  }

  /** Lectures à jour, hors cache. */
  openingHours(): Observable<OpeningRangeDto[]> {
    return this.api.manageRestaurantHoursGet().pipe(unwrap());
  }

  closures(includePast?: boolean): Observable<ClosureDetails[]> {
    return this.api.manageRestaurantClosuresGet({ includePast }).pipe(unwrap());
  }

  settings(): Observable<RestaurantSettingsDetails> {
    return this.api.manageRestaurantSettingsGet().pipe(unwrap());
  }

  settingsHistory(take?: number): Observable<RestaurantSettingsHistoryItem[]> {
    return this.api.manageRestaurantSettingsHistoryGet({ take }).pipe(unwrap());
  }

  pause(body: PauseRequest): Observable<OpeningStateDto> {
    return this.api.manageRestaurantPausePost({ body }).pipe(unwrap());
  }

  resume(): Observable<OpeningStateDto> {
    return this.api.manageRestaurantResumePost().pipe(unwrap());
  }
}
