import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CounterOrderCreate,
  ManageOrdersApi,
  ManageOrdersGet$Params,
  OrderDetails,
  OrderSummary,
  PaymentDeclare,
  ReasonRequest,
} from '../../core/api/generated';
import { Page, toVoid, unwrap, unwrapPage } from './api-operators';

/** Commandes côté restaurant : comptoir, cuisine, encaissement. */
@Service()
export class ManageOrdersService {
  private readonly api = inject(ManageOrdersApi);

  createCounterOrder(body: CounterOrderCreate): Observable<OrderDetails> {
    return this.api.manageOrdersCounterPost({ body }).pipe(unwrap());
  }

  list(params?: ManageOrdersGet$Params): Observable<Page<OrderSummary>> {
    return this.api.manageOrdersGet(params).pipe(unwrapPage());
  }

  kitchen(): Observable<OrderDetails[]> {
    return this.api.manageOrdersKitchenGet().pipe(unwrap());
  }

  get(id: string): Observable<OrderDetails> {
    return this.api.manageOrdersIdGet({ id }).pipe(unwrap());
  }

  accept(id: string): Observable<OrderDetails> {
    return this.api.manageOrdersIdAcceptPost({ id }).pipe(unwrap());
  }

  refuse(id: string, body: ReasonRequest): Observable<OrderDetails> {
    return this.api.manageOrdersIdRefusePost({ id, body }).pipe(unwrap());
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

  declarePayment(id: string, body: PaymentDeclare): Observable<OrderDetails> {
    return this.api.manageOrdersIdPaymentsPost({ id, body }).pipe(unwrap());
  }

  /** Commandes d'un client, les plus récentes d'abord (pages à partir de 1). */
  customerOrders(userId: string, page = 1, pageSize = 20): Observable<Page<OrderSummary>> {
    return this.api.manageCustomersUserIdOrdersGet({ userId, page, pageSize }).pipe(unwrapPage());
  }

  resetCustomerNoShows(userId: string): Observable<void> {
    return this.api.manageCustomersUserIdNoShowsResetPost({ userId }).pipe(toVoid());
  }
}
