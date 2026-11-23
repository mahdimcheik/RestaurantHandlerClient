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

  it('propose accepter ou refuser une commande à valider', async () => {
    await open(order({ status: 'AwaitingApproval', channel: 'Online', customerNoShowCount: 2 }));
    expect(buttons()).toEqual(['Accepter', 'Refuser']);
    expect(text(fixture)).toContain('2 non-venues');
    expect(fixture.nativeElement.querySelector('app-payment-panel')).toBeNull();
  });

  it('accepte et affiche la commande renvoyée par le serveur', async () => {
    await open(order({ status: 'AwaitingApproval' }));
    clickButton(fixture, 'Accepter');
    http.expectOne('/manage/orders/o1/accept').flush(envelope(order({ status: 'Confirmed' })));
    await settle();

    expect(text(fixture)).toContain('Commande acceptée');
    expect(buttons()).toEqual(['Annuler la commande']);
    expect(fixture.nativeElement.querySelector('app-payment-panel')).not.toBeNull();
  });

  it('refuse avec un motif obligatoire', async () => {
    await open(order({ status: 'AwaitingApproval' }));
    clickButton(fixture, 'Refuser');
    await settle();
    const dialog = fixture.nativeElement.querySelector('dialog[open]') as HTMLDialogElement;
    dialog.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    http.expectNone('/manage/orders/o1/refuse');

    const reason = dialog.querySelector('textarea')!;
    reason.value = 'Plus de pâte';
    reason.dispatchEvent(new Event('input'));
    dialog.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    const request = http.expectOne('/manage/orders/o1/refuse');
    expect(request.request.body).toEqual({ reason: 'Plus de pâte' });
    request.flush(envelope(order({ status: 'Refused' })));
    await settle();
    expect(buttons()).toEqual([]);
  });

  it('demande d’encaisser une commande prête non payée avant de la remettre', async () => {
    await open(order({ status: 'Ready', pickupAt: '2099-01-01T12:00:00+01:00' }));
    expect(buttons()).toEqual(['Annuler la commande']);
    expect(text(fixture)).toContain('À encaisser avant la remise');
  });

  it('remet une commande prête et payée', async () => {
    await open(order({ status: 'Ready', isPaid: true, paidCents: 1850 }));
    clickButton(fixture, 'Remettre au client');
    http
      .expectOne('/manage/orders/o1/complete')
      .flush(envelope(order({ status: 'Completed', isPaid: true })));
    await settle();
    expect(text(fixture)).toContain('Commande remise au client');
  });

  it('relit la commande et prévient sur 409', async () => {
    await open(order({ status: 'AwaitingApproval' }));
    clickButton(fixture, 'Accepter');
    http
      .expectOne('/manage/orders/o1/accept')
      .flush(
        { message: 'Transition refusée.', status: 409 },
        { status: 409, statusText: 'Conflict' },
      );
    await settle();
    http.expectOne('/manage/orders/o1').flush(envelope(order({ status: 'Refused' })));
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
