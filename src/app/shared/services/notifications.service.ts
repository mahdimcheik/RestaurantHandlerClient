import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  FilterNotification,
  NotificationDetails,
  NotificationsApi,
  PushSubscriptionCreate,
  PushSubscriptionDelete,
} from '../../core/api/generated';
import { Page, toVoid, unwrap, unwrapPage } from './api-operators';

@Service()
export class NotificationsService {
  private readonly api = inject(NotificationsApi);

  list(body: FilterNotification): Observable<Page<NotificationDetails>> {
    return this.api.notificationsPost({ body }).pipe(unwrapPage());
  }

  toggleSeen(id: string): Observable<NotificationDetails> {
    return this.api.notificationsIdToggleSeenPut({ id }).pipe(unwrap());
  }

  toggleAllSeen(): Observable<void> {
    return this.api.notificationsAllToggleSeenPut().pipe(toVoid());
  }

  pushPublicKey(): Observable<string> {
    return this.api.notificationsPushPublicKeyGet().pipe(unwrap());
  }

  subscribePush(body: PushSubscriptionCreate): Observable<void> {
    return this.api.notificationsPushSubscribePost({ body }).pipe(toVoid());
  }

  unsubscribePush(body: PushSubscriptionDelete): Observable<void> {
    return this.api.notificationsPushUnsubscribePost({ body }).pipe(toVoid());
  }
}
