import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fakeRealtime } from '../../../../core/realtime/testing';
import { NO_CUSTOMIZATION } from '../../../../shared/ordering/cart';
import { PublicStore } from '../../../../shared/services/public-store.service';
import { envelope, text } from '../../../../shared/testing';
import { CartStore } from '../../data-access/cart.store';
import { CARD, EmptyPage, settle } from '../../testing';
import { CartSummary } from './cart-summary';

describe('CartSummary', () => {
  let fixture: ComponentFixture<CartSummary>;
  let http: HttpTestingController;
  let cart: CartStore;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [CartSummary],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: EmptyPage }]),
        fakeRealtime().provider,
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const store = TestBed.inject(PublicStore);
    store.card.load();
    TestBed.tick();
    http.expectOne('/menu').flush(envelope(CARD));
    await settle();
    cart = TestBed.inject(CartStore);
    cart.addProduct(store.products().get('cola')!, NO_CUSTOMIZATION, 2);
    fixture = TestBed.createComponent(CartSummary);
    await settle(310);
  });

  afterEach(() => http.verify());

  it('affiche les lignes et le total du devis, et prévient quand le client quitte le détail', async () => {
    http.expectOne('/orders/quote').flush(
      envelope({
        totalCents: 600,
        lines: [{ index: 0, name: 'Cola', quantity: 2, unitTotalCents: 300, lineTotalCents: 600 }],
        vat: [{ rate: 5.5, baseCents: 569, vatCents: 31 }],
      }),
    );
    await settle();
    expect(text(fixture)).toContain('2 × Cola');
    expect(text(fixture)).toContain('6,00');

    const navigated = vi.fn();
    fixture.componentInstance.navigated.subscribe(navigated);
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLAnchorElement>('.ticket__send')!
      .click();
    expect(navigated).toHaveBeenCalledTimes(1);
  });

  it('signale une ligne refusée par le serveur et bloque la validation', async () => {
    http
      .expectOne('/orders/quote')
      .flush(
        { message: 'Panier refusé', issues: [{ lineIndex: 0, message: 'Cola en rupture' }] },
        { status: 409, statusText: 'Conflict' },
      );
    await settle();
    expect(text(fixture)).toContain('Cola en rupture');
    const send = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button.ticket__send',
    );
    expect(send?.disabled).toBe(true);
    expect(text(fixture)).toContain('Prix indisponible');
  });
});
