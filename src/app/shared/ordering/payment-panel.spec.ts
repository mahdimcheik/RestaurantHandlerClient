import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderDetails } from '../../core/api/generated';
import { clickButton, envelope, fill, order, submitForm, text } from '../testing';
import { PaymentPanel } from './payment-panel';

describe('PaymentPanel', () => {
  let fixture: ComponentFixture<PaymentPanel>;
  let http: HttpTestingController;
  let paid: OrderDetails[];
  let conflicts: number;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [PaymentPanel],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(PaymentPanel);
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('order', order({ totalCents: 1850, paidCents: 500 }));
    paid = [];
    conflicts = 0;
    fixture.componentInstance.paid.subscribe((value) => paid.push(value));
    fixture.componentInstance.conflict.subscribe(() => conflicts++);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('affiche le reste à encaisser donné par le serveur', () => {
    expect(text(fixture)).toContain('Reste à encaisser');
    expect(text(fixture)).toContain('13,50');
  });

  it('encaisse tout le reste en une touche, sans montant', async () => {
    clickButton(fixture, 'Espèces');
    const request = http.expectOne('/manage/orders/o1/payments');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ method: 'OnSiteCash' });
    request.flush(envelope(order({ isPaid: true, paidCents: 1850 })));
    await fixture.whenStable();

    expect(paid.map((value) => value.isPaid)).toEqual([true]);
  });

  it('enregistre une part avec le moyen choisi (paiement mixte)', async () => {
    fill(fixture, 'Montant encaissé (€)', '5,50');
    const card = [...(fixture.nativeElement as HTMLElement).querySelectorAll('label')].find(
      (label) => label.textContent?.trim() === 'Carte',
    );
    card?.querySelector('input')?.dispatchEvent(new Event('change'));
    submitForm(fixture);
    await fixture.whenStable();

    const request = http.expectOne('/manage/orders/o1/payments');
    expect(request.request.body).toEqual({ method: 'OnSiteCard', amountCents: 550 });
    request.flush(envelope(order({ paidCents: 1050 })));
    await fixture.whenStable();
    expect(paid).toHaveLength(1);
  });

  it('refuse un montant mal saisi sans appeler le serveur', async () => {
    fill(fixture, 'Montant encaissé (€)', 'douze');
    submitForm(fixture);
    await fixture.whenStable();
    http.expectNone('/manage/orders/o1/payments');
  });

  it('prévient le parent sur 409 et affiche le message du serveur', async () => {
    clickButton(fixture, 'Carte');
    http
      .expectOne('/manage/orders/o1/payments')
      .flush(
        { message: 'Cette commande est déjà payée.', status: 409 },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    expect(conflicts).toBe(1);
    expect(text(fixture)).toContain('Cette commande est déjà payée.');
  });
});
