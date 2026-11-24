import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CheckoutOptions, OpeningStateDto, PickupSlotDto } from '../../../../core/api/generated';
import { fakeRealtime } from '../../../../core/realtime/testing';
import { envelope, order, submitForm, text } from '../../../../shared/testing';
import { CartStore } from '../../data-access/cart.store';
import { EmptyPage, settle } from '../../testing';
import { CheckoutPage } from './checkout-page';

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
  ): Promise<void> {
    fixture = TestBed.createComponent(CheckoutPage);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    http.expectOne('/restaurant/status').flush(envelope({ status, asapDelayMinutes: 15 }));
    http.expectOne('/restaurant/slots').flush(envelope(slots));
    http.expectOne('/orders/checkout-options').flush(envelope(options));
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

  it('envoie une commande au retrait dès que possible et ouvre son suivi', async () => {
    await open('Open', [SLOT], { onlinePaymentEnabled: false, canPayOnSite: true });
    expect(text(fixture)).toContain('Dès que possible (prête dans ~15 min)');
    expect(radio('asap')?.checked).toBe(true);
    expect(radio('Online')?.disabled).toBe(true);
    expect(radio('OnSite')?.checked).toBe(true);
    const key = cart.idempotencyKey();

    submitForm(fixture);
    await settle();
    const request = http.expectOne('/orders');
    expect(request.request.body).toMatchObject({
      idempotencyKey: key,
      lines: [{ productId: 'cola', quantity: 1 }],
      pickupMode: 'Asap',
      slotStart: null,
      paymentChoice: 'OnSite',
    });
    request.flush(envelope(order({ id: 'o42', status: 'AwaitingApproval' })), {
      status: 201,
      statusText: 'Created',
    });
    await settle();

    expect(cart.isEmpty()).toBe(true);
    expect(TestBed.inject(Router).url).toBe('/commandes/o42');
  });

  it('propose seulement les créneaux quand le restaurant est fermé, et montre le blocage du paiement au retrait', async () => {
    await open('Closed', [SLOT], {
      onlinePaymentEnabled: true,
      canPayOnSite: false,
      payOnSiteBlockedReason: 'Vous avez déjà une commande à payer au retrait en cours.',
    });
    expect(radio('asap')).toBeNull();
    expect(radio(SLOT.start)?.checked).toBe(true);
    expect(radio('OnSite')?.disabled).toBe(true);
    expect(text(fixture)).toContain('déjà une commande à payer au retrait');
    expect(radio('Online')?.checked).toBe(true);
  });

  it('renvoie au panier avec les lignes refusées par le serveur', async () => {
    await open('Open', [], { onlinePaymentEnabled: true, canPayOnSite: true });
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
    await open('Closed', [], { onlinePaymentEnabled: true, canPayOnSite: true });
    expect(text(fixture)).toContain('Plus aucun créneau de retrait');
    const submit = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[type=submit]',
    );
    expect(submit?.disabled).toBe(true);
  });
});
