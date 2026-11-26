import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  InvoiceRequestDetails,
  InvoiceRequestsApi,
  ManageInvoiceRequestsGet$Params,
} from '../../core/api/generated';
import { Page, unwrap, unwrapPage } from './api-operators';

/** Demandes de facture électronique (US-E05-6). */
@Service()
export class InvoiceRequestsService {
  private readonly api = inject(InvoiceRequestsApi);

  /** Demande de la commande, `null` si aucune facture n'a été demandée. */
  forOrder(orderId: string): Observable<InvoiceRequestDetails | null> {
    return this.api
      .ordersOrderIdInvoiceRequestGet({ orderId })
      .pipe(map((response) => response.data ?? null));
  }

  list(params?: ManageInvoiceRequestsGet$Params): Observable<Page<InvoiceRequestDetails>> {
    return this.api.manageInvoiceRequestsGet(params).pipe(unwrapPage());
  }

  retry(id: string): Observable<InvoiceRequestDetails> {
    return this.api.manageInvoiceRequestsIdRetryPost({ id }).pipe(unwrap());
  }
}
