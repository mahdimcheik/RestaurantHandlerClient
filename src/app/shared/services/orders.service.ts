import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CheckoutOptions,
  OrderCreate,
  OrderDetails,
  OrderReceipt,
  OrdersApi,
  OrderSummary,
  QuoteRequest,
  QuoteResult,
} from '../../core/api/generated';
import { Page, unwrap, unwrapPage } from './api-operators';

/** Commandes côté client. */
@Service()
export class OrdersService {
  private readonly api = inject(OrdersApi);

  quote(body: QuoteRequest): Observable<QuoteResult> {
    return this.api.ordersQuotePost({ body }).pipe(unwrap());
  }

  /** Paiement en ligne disponible ou non (indication : la validation revérifie). */
  checkoutOptions(): Observable<CheckoutOptions> {
    return this.api.ordersCheckoutOptionsGet().pipe(unwrap());
  }

  create(body: OrderCreate): Observable<OrderDetails> {
    return this.api.ordersPost({ body }).pipe(unwrap());
  }

  pay(id: string): Observable<OrderDetails> {
    return this.api.ordersIdPaymentPost({ id }).pipe(unwrap());
  }

  receipt(id: string): Observable<OrderReceipt> {
    return this.api.ordersIdReceiptGet({ id }).pipe(unwrap());
  }

  mine(page?: number, pageSize?: number): Observable<Page<OrderSummary>> {
    return this.api.ordersMineGet({ page, pageSize }).pipe(unwrapPage());
  }

  mineCurrent(): Observable<OrderSummary[]> {
    return this.api.ordersMineCurrentGet().pipe(unwrap());
  }

  get(id: string): Observable<OrderDetails> {
    return this.api.ordersIdGet({ id }).pipe(unwrap());
  }
}
