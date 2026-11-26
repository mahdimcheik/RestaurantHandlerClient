import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { InvoiceRequestDetails, OrderReceipt } from '../../../../core/api/generated';
import { envelope, text } from '../../../../shared/testing';
import { ReceiptPage } from './receipt-page';

const receipt: OrderReceipt = {
  tradeName: 'Chez Nino',
  legalName: 'Nino SAS',
  address: '3 place du Marché, 69000 Lyon',
  siret: '12345678900011',
  vatNumber: 'FR00123456789',
  orderNumber: 1042,
  dailyNumber: 12,
  paidAt: '2026-11-23T12:05:00+01:00',
  totalCents: 1100,
  items: [
    {
      id: 'i1',
      name: 'Burger',
      quantity: 1,
      unitPriceCents: 1100,
      lineTotalCents: 1100,
      components: [],
      modifications: [],
    },
  ],
  vat: [{ rate: 10, grossCents: 1100, netCents: 1000, vatCents: 100 }],
  payments: [
    { id: 'p0', method: 'SumupOnline', status: 'Failed', amountCents: 1100 },
    { id: 'p1', method: 'SumupOnline', status: 'Successful', amountCents: 1100 },
  ],
};

async function open(invoice: InvoiceRequestDetails | null) {
  TestBed.configureTestingModule({
    imports: [ReceiptPage],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const fixture = TestBed.createComponent(ReceiptPage);
  fixture.componentRef.setInput('id', 'o1');
  TestBed.tick();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne('/orders/o1/receipt').flush(envelope(receipt));
  http.expectOne('/orders/o1/invoice-request').flush(envelope(invoice));
  for (const request of http.match('/restaurant/info')) {
    request.flush(envelope({}));
  }
  await fixture.whenStable();
  return fixture;
}

describe('ReceiptPage', () => {
  it('porte vendeur, lignes, TVA par taux, total et paiement réussi', async () => {
    const fixture = await open(null);
    expect(fixture.nativeElement.querySelector('.receipt__invoice')).toBeNull();
    const content = text(fixture).replace(/\s+/g, ' ');
    expect(content).toContain('Nino SAS');
    expect(content).toContain('SIRET 12345678900011');
    expect(content).toContain('N° TVA FR00123456789');
    expect(content).toContain('Commande 1042 (n° du jour 12)');
    const compact = content.replace(/\s+/g, '');
    expect(compact).toContain('TotalHT10,00€');
    expect(compact).toContain('TVA10%sur10,00€1,00€');
    expect(compact).toContain('TotalTTC11,00€');
    expect(fixture.nativeElement.querySelectorAll('.receipt__payments li').length).toBe(1);
  });

  it('indique où en est la facture demandée par un client professionnel', async () => {
    const fixture = await open({
      id: 'r1',
      orderId: 'o1',
      orderNumber: 1042,
      status: 'Failed',
      buyerSiren: '404833048',
      buyerLegalName: 'Burgers & Co',
      attempts: 2,
      createdAt: '2026-11-23T12:05:00+01:00',
    });
    const content = text(fixture);
    // Un échec technique est retenté : le client voit la facture « en cours ».
    expect(content).toContain('Facture demandée : en cours de préparation.');
    expect(content).toContain('Burgers & Co, SIREN 404833048');
  });
});
