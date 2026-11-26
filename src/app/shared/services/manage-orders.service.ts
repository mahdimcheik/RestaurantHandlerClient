import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ManageOrdersApi,
  ManageOrdersGet$Params,
  OrderDetails,
  OrderSummary,
  ReasonRequest,
} from '../../core/api/generated';
import { Page, unwrap, unwrapPage } from './api-operators';

/** Commandes côté restaurant : cuisine, remise, annulation, remboursement. */
@Service()
export class ManageOrdersService {
  private readonly api = inject(ManageOrdersApi);

  list(params?: ManageOrdersGet$Params): Observable<Page<OrderSummary>> {
    return this.api.manageOrdersGet(params).pipe(unwrapPage());
  }

  kitchen(): Observable<OrderDetails[]> {
    return this.api.manageOrdersKitchenGet().pipe(unwrap());
  }

  get(id: string): Observable<OrderDetails> {
    return this.api.manageOrdersIdGet({ id }).pipe(unwrap());
  }

  start(id: string): Observable<OrderDetails> {
    return this.api.manageOrdersIdStartPost({ id }).pipe(unwrap());
  }

  markReady(id: string): Observable<OrderDetails> {
    return this.api.manageOrdersIdReadyPost({ id }).pipe(unwrap());
  }

  undo(id: string): Observable<OrderDetails> {
    return this.api.manageOrdersIdUndoPost({ id }).pipe(unwrap());
  }

  complete(id: string): Observable<OrderDetails> {
    return this.api.manageOrdersIdCompletePost({ id }).pipe(unwrap());
  }

  markNoShow(id: string): Observable<OrderDetails> {
    return this.api.manageOrdersIdNoShowPost({ id }).pipe(unwrap());
  }

  cancel(id: string, body: ReasonRequest): Observable<OrderDetails> {
    return this.api.manageOrdersIdCancelPost({ id, body }).pipe(unwrap());
  }

  refund(id: string): Observable<OrderDetails> {
    return this.api.manageOrdersIdRefundPost({ id }).pipe(unwrap());
  }

  /** Commandes d'un client, les plus récentes d'abord (pages à partir de 1). */
  customerOrders(userId: string, page = 1, pageSize = 20): Observable<Page<OrderSummary>> {
    return this.api.manageCustomersUserIdOrdersGet({ userId, page, pageSize }).pipe(unwrapPage());
  }
}
