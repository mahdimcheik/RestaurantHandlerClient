import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { clickButton, envelope, fill, text } from '../../../../shared/testing';
import { restaurantDay } from '../../../../shared/utils/restaurant-time';
import { fakeRealtime, summary } from '../../testing';
import { OrdersPage } from './orders-page';

const settle = async () => {
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
};

describe('OrdersPage', () => {
  let fixture: ComponentFixture<OrdersPage>;
  let http: HttpTestingController;
  let realtime: ReturnType<typeof fakeRealtime>;

  const day = [
    summary({ id: 'a', dailyNumber: 3, status: 'Ready', isPaid: true }),
    summary({
      id: 'b',
      dailyNumber: 14,
      status: 'PendingPayment',
      isPaid: false,
      customerLabel: 'Léa',
      pickupAt: '2026-11-23T13:00:00+01:00',
    }),
    summary({ id: 'c', dailyNumber: 15, status: 'InPreparation' }),
    summary({ id: 'd', dailyNumber: 1, status: 'Completed', isPaid: true }),
  ];

  const answer = async (orders = day) => {
    TestBed.tick();
    const request = http.expectOne((r) => r.url === '/manage/orders');
    expect(request.request.params.get('Date')).toBe(restaurantDay());
    request.flush(envelope(orders));
    await settle();
  };

  const numbers = () =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr td:first-child')].map(
      (cell) => cell.textContent?.trim(),
    );

  beforeEach(async () => {
    realtime = fakeRealtime();
    TestBed.configureTestingModule({
      imports: [OrdersPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        realtime.provider,
      ],
    });
    fixture = TestBed.createComponent(OrdersPage);
    http = TestBed.inject(HttpTestingController);
    await answer();
  });

  afterEach(() => http.verify());

  it('liste les commandes du jour par heure de retrait, closes en bas', () => {
    expect(numbers()).toEqual(['N° 3', 'N° 15', 'N° 14', 'N° 1']);
    expect(text(fixture)).toContain('Léa');
    expect(text(fixture)).not.toContain('À valider');
    expect(text(fixture)).not.toContain('Comptoir');
  });

  it('filtre par étape et compte chaque étape', async () => {
    expect(text(fixture)).not.toContain('À encaisser');
    expect(text(fixture)).toContain('Paiement en cours 1');
    clickButton(fixture, 'En cours 1');
    await settle();
    expect(numbers()).toEqual(['N° 15']);

    clickButton(fixture, 'Closes 1');
    await settle();
    expect(numbers()).toEqual(['N° 1']);
  });

  it('retrouve une commande par son numéro du jour', async () => {
    fill(fixture, 'N° de commande', '1');
    await settle();
    expect(numbers()).toEqual(['N° 15', 'N° 14', 'N° 1']);
  });

  it('relit la liste à chaque événement de commande', async () => {
    realtime.emit('OrderCreated', summary({ id: 'e' }));
    await answer([...day, summary({ id: 'e', dailyNumber: 16 })]);
    expect(numbers()).toContain('N° 16');
  });

  it('signale une anomalie de paiement avec un lien vers la commande', async () => {
    realtime.emit('PaymentAnomaly', {
      orderId: 'b',
      dailyNumber: 14,
      issue: 'Remboursement en échec',
    });
    await answer();
    expect(text(fixture)).toContain('Remboursement en échec');
    clickButton(fixture, 'Masquer');
    await settle();
    expect(text(fixture)).not.toContain('Remboursement en échec');
  });
});
