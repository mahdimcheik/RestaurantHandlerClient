import { inject, Service } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
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

/** Partie modifiable des réglages : le PUT remplace l'ensemble. */
export function settingsWrite(settings: RestaurantSettingsDetails): RestaurantSettingsWrite {
  return {
    tradeName: settings.tradeName,
    legalName: settings.legalName,
    address: settings.address,
    phone: settings.phone,
    siret: settings.siret,
    vatNumber: settings.vatNumber,
    asapDelayMinutes: settings.asapDelayMinutes,
    slotDurationMinutes: settings.slotDurationMinutes,
    slotCapacityOrders: settings.slotCapacityOrders,
    minLeadMinutes: settings.minLeadMinutes,
    pickupGraceMinutes: settings.pickupGraceMinutes,
    onlinePaymentExpiryMinutes: settings.onlinePaymentExpiryMinutes,
  };
}

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

  /** Délai ASAP ajusté pendant le service : relit les réglages puis les renvoie en entier. */
  updateAsapDelay(minutes: number): Observable<RestaurantSettingsDetails> {
    return this.settings().pipe(
      switchMap((current) =>
        this.updateSettings({ ...settingsWrite(current), asapDelayMinutes: minutes }),
      ),
    );
  }

  uploadLogo(file: Blob): Observable<RestaurantSettingsDetails> {
    return this.api
      .manageRestaurantSettingsLogoPost({ body: { file } })
      .pipe(unwrap(), refresh(this.store.settings));
  }

  removeLogo(): Observable<RestaurantSettingsDetails> {
    return this.api
      .manageRestaurantSettingsLogoDelete()
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
