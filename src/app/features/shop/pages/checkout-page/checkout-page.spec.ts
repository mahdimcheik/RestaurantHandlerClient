import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  BusinessProfileDetails,
  CheckoutOptions,
  OpeningStateDto,
  PickupSlotDto,
} from '../../../../core/api/generated';
import { fakeRealtime } from '../../../../core/realtime/testing';
import { envelope, order, submitForm, text } from '../../../../shared/testing';
import { CartStore } from '../../data-access/cart.store';
import { EmptyPage, settle } from '../../testing';
import { CheckoutPage } from './checkout-page';

const BUSINESS: BusinessProfileDetails = {
  siren: '404833048',
  legalName: 'Burgers & Co',
  vatNumber: 'FR83404833048',
  addressLine1: '1 rue de la Paix',
  postalCode: '75002',
  city: 'Paris',
  countryCode: 'FR',
  createdAt: '2026-11-20T10:00:00Z',
};

const SLOT: PickupSlotDto = {
  start: '2026-11-23T12:15:00+01:00',
  end: '2026-11-23T12:30:00+01:00',
  remaining: 3,
};

describe('CheckoutPage', () => {
  let fixture: ComponentFixture<CheckoutPage>;
  let http: HttpTestingController;
  let cart: CartStore;

  const radio = (value: string) =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      `input[type=radio][value="${value}"]`,
    );

  async function open(
    status: OpeningStateDto['status'],
    slots: PickupSlotDto[],
    options: CheckoutOptions,
    business: BusinessProfileDetails | null = null,
  ): Promise<void> {
    fixture = TestBed.createComponent(CheckoutPage);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    http.expectOne('/restaurant/status').flush(envelope({ status, asapDelayMinutes: 15 }));
    http.expectOne('/restaurant/slots').flush(envelope(slots));
    http.expectOne('/orders/checkout-options').flush(envelope(options));
    http.expectOne('/users/me/business-profile').flush(envelope(business));
    for (const request of http.match('/restaurant/info')) {
      request.flush(envelope({}));
    }
    await settle(310);
    http.expectOne('/orders/quote').flush(
      envelope({
        totalCents: 1000,
        lines: [
          { index: 0, name: 'Cola', quantity: 1, unitTotalCents: 1000, lineTotalCents: 1000 },
        ],
        vat: [],
      }),
    );
    await settle();
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [CheckoutPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: EmptyPage }]),
        fakeRealtime().provider,
      ],
    });
    cart = TestBed.inject(CartStore);
    cart.addProduct({ id: 'cola', name: 'Cola' });
  });

  afterEach(() => http.verify());

  it('envoie une commande payée par carte, dès que possible, sans choix de paiement', async () => {
    await open('Open', [SLOT], { onlinePaymentEnabled: true });
    expect(text(fixture)).toContain('Dès que possible (prête dans ~15 min)');
    expect(radio('asap')?.checked).toBe(true);
    expect(text(fixture)).toContain('Carte bancaire, en ligne');
    expect(text(fixture)).not.toContain('Payer au retrait');
    expect(radio('OnSite')).toBeNull();
    expect(text(fixture)).toContain('pour annuler, appelez le restaurant');
    const key = cart.idempotencyKey();

    submitForm(fixture);
    await settle();
    const request = http.expectOne('/orders');
    expect(request.request.body).toMatchObject({
      idempotencyKey: key,
      lines: [{ productId: 'cola', quantity: 1 }],
      pickupMode: 'Asap',
      slotStart: null,
      requestInvoice: false,
    });
    expect(request.request.body).not.toHaveProperty('paymentChoice');
    expect(text(fixture)).not.toContain('Je souhaite une facture');
    // Page SumUp pas encore créée : le suivi propose de réessayer le paiement.
    request.flush(envelope(order({ id: 'o42', status: 'PendingPayment', isPaid: false })), {
      status: 201,
      statusText: 'Created',
    });
    await settle();

    expect(cart.isEmpty()).toBe(true);
    expect(TestBed.inject(Router).url).toBe('/commandes/o42');
  });

  it('propose la facture à un client professionnel, cochée par défaut', async () => {
    await open('Open', [SLOT], { onlinePaymentEnabled: true }, BUSINESS);
    expect(text(fixture)).toContain(
      'Je souhaite une facture au nom de Burgers & Co (SIREN 404833048)',
    );
    const box = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type=checkbox]',
    );
    expect(box?.checked).toBe(true);

    submitForm(fixture);
    await settle();
    const request = http.expectOne('/orders');
    expect(request.request.body).toMatchObject({ requestInvoice: true });
    request.flush(envelope(order({ id: 'o43', invoiceRequested: true })), {
      status: 201,
      statusText: 'Created',
    });
    await settle();
  });

  it('le client professionnel peut renoncer à la facture', async () => {
    await open('Open', [SLOT], { onlinePaymentEnabled: true }, BUSINESS);
    const box = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type=checkbox]',
    )!;
    box.click();
    await settle();

    submitForm(fixture);
    await settle();
    const request = http.expectOne('/orders');
    expect(request.request.body).toMatchObject({ requestInvoice: false });
    request.flush(envelope(order({ id: 'o44' })), { status: 201, statusText: 'Created' });
    await settle();
  });

  it('bloque la validation quand le paiement en ligne est coupé', async () => {
    await open('Open', [SLOT], { onlinePaymentEnabled: false });
    expect(text(fixture)).toContain('Le paiement en ligne est indisponible pour le moment');
    const submit = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[type=submit]',
    );
    expect(submit?.disabled).toBe(true);
  });

  it('propose seulement les créneaux quand Greenadine est fermé', async () => {
    await open('Closed', [SLOT], { onlinePaymentEnabled: true });
    expect(radio('asap')).toBeNull();
    expect(radio(SLOT.start)?.checked).toBe(true);
  });

  it('renvoie au panier avec les lignes refusées par le serveur', async () => {
    await open('Open', [], { onlinePaymentEnabled: true });
    submitForm(fixture);
    await settle();
    http.expectOne('/orders').flush(
      {
        status: 409,
        message: 'Votre panier doit être mis à jour : Cola en rupture.',
        issues: [{ lineIndex: 0, message: 'Cola en rupture.' }],
      },
      { status: 409, statusText: 'Conflict' },
    );
    await settle();

    expect(cart.issues()).toEqual([{ lineIndex: 0, message: 'Cola en rupture.' }]);
    expect(cart.isEmpty()).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/panier');
  });

  it('annonce que la commande est impossible sans créneau, restaurant fermé', async () => {
    await open('Closed', [], { onlinePaymentEnabled: true });
    expect(text(fixture)).toContain('Plus aucun créneau de retrait');
    const submit = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[type=submit]',
    );
    expect(submit?.disabled).toBe(true);
  });
});
