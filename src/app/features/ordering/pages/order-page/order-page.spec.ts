import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OrderDetails } from '../../../../core/api/generated';
import { clickButton, envelope, polyfillDialog, text } from '../../../../shared/testing';
import { fakeRealtime, order } from '../../testing';
import { OrderPage } from './order-page';

const settle = async () => {
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
};

describe('OrderPage', () => {
  let fixture: ComponentFixture<OrderPage>;
  let http: HttpTestingController;
  let realtime: ReturnType<typeof fakeRealtime>;

  beforeAll(polyfillDialog);

  async function open(initial: OrderDetails): Promise<void> {
    realtime = fakeRealtime();
    TestBed.configureTestingModule({
      imports: [OrderPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        realtime.provider,
      ],
    });
    fixture = TestBed.createComponent(OrderPage);
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('id', 'o1');
    TestBed.tick();
    http
      .expectOne('/manage/restaurant/settings')
      .flush(envelope({ tradeName: 'R', isPaused: false, pickupGraceMinutes: 15 }));
    http.expectOne('/manage/orders/o1').flush(envelope(initial));
    await settle();
  }

  const buttons = () =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('.action-bar button')].map(
      (button) => button.textContent?.trim(),
    );

  afterEach(() => http.verify());

  it('montre une commande payée en ligne, sans validation ni encaissement', async () => {
    await open(order({ status: 'Confirmed' }));
    expect(buttons()).toEqual(['Annuler la commande']);
    expect(text(fixture)).toContain('Payée par carte en ligne');
    expect(text(fixture)).not.toContain('Canal');
    expect(text(fixture)).not.toContain('non-venue');
  });

  it('annule à la demande du client, avec un motif obligatoire', async () => {
    await open(order({ status: 'Confirmed' }));
    clickButton(fixture, 'Annuler la commande');
    await settle();
    const dialog = fixture.nativeElement.querySelector('dialog[open]') as HTMLDialogElement;
    expect(dialog.textContent).toContain('il ne peut pas annuler lui-même');
    dialog.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    http.expectNone('/manage/orders/o1/cancel');

    const reason = dialog.querySelector('textarea')!;
    reason.value = 'Demandé par téléphone';
    reason.dispatchEvent(new Event('input'));
    dialog.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    const request = http.expectOne('/manage/orders/o1/cancel');
    expect(request.request.body).toEqual({ reason: 'Demandé par téléphone' });
    request.flush(envelope(order({ status: 'Cancelled' })));
    await settle();
    expect(text(fixture)).toContain('Commande annulée');
    expect(buttons()).toEqual([]);
  });

  it('remet une commande prête', async () => {
    await open(order({ status: 'Ready' }));
    clickButton(fixture, 'Remettre au client');
    http
      .expectOne('/manage/orders/o1/complete')
      .flush(envelope(order({ status: 'Completed', isPaid: true })));
    await settle();
    expect(text(fixture)).toContain('Commande remise au client');
  });

  it('relit la commande et prévient sur 409', async () => {
    await open(order({ status: 'Ready' }));
    clickButton(fixture, 'Remettre au client');
    http
      .expectOne('/manage/orders/o1/complete')
      .flush(
        { message: 'Transition refusée.', status: 409 },
        { status: 409, statusText: 'Conflict' },
      );
    await settle();
    http.expectOne('/manage/orders/o1').flush(envelope(order({ status: 'Cancelled' })));
    await settle();

    expect(text(fixture)).toContain('La commande a changé entre-temps');
    expect(buttons()).toEqual([]);
  });

  it('se relit quand un événement concerne cette commande, et seulement elle', async () => {
    await open(order());
    realtime.emit('OrderStatusChanged', { id: 'autre' });
    await settle();
    http.expectNone('/manage/orders/o1');

    realtime.emit('OrderStatusChanged', { id: 'o1' });
    await settle();
    http.expectOne('/manage/orders/o1').flush(envelope(order({ status: 'InPreparation' })));
    await settle();
    expect(text(fixture)).toContain('En préparation');
  });
});
