import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fakeRealtime } from '../../../../core/realtime/testing';
import { envelope, order, polyfillDialog, summary, text } from '../../../../shared/testing';
import { PAYMENT_POLL_MS, TrackingPage } from './tracking-page';

const settle = async () => {
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
};

const online = order({
  id: 'o1',
  dailyNumber: 42,
  status: 'Confirmed',
  isPaid: true,
  items: [
    {
      id: 'i1',
      name: 'Burger',
      quantity: 1,
      unitPriceCents: 1200,
      lineTotalCents: 1200,
      components: [],
      modifications: [{ type: 'Remove', label: 'Sans oignons', quantity: 1, unitPriceCents: 0 }],
    },
  ],
});

describe('TrackingPage', () => {
  let fixture: ComponentFixture<TrackingPage>;
  let http: HttpTestingController;
  let realtime: ReturnType<typeof fakeRealtime>;
  let vibrate: ReturnType<typeof vi.fn>;

  const answer = async (value = online, info: object = { phone: '01 23 45 67 89' }) => {
    TestBed.tick();
    http.expectOne('/orders/o1').flush(envelope(value));
    for (const request of http.match('/restaurant/info')) {
      request.flush(envelope(info));
    }
    await settle();
  };

  beforeEach(async () => {
    polyfillDialog();
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    realtime = fakeRealtime();
    TestBed.configureTestingModule({
      imports: [TrackingPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        realtime.provider,
      ],
    });
    fixture = TestBed.createComponent(TrackingPage);
    fixture.componentRef.setInput('id', 'o1');
    http = TestBed.inject(HttpTestingController);
    await answer();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('montre le numéro, l’état côté client, le contenu et le paiement', () => {
    expect(text(fixture)).toContain('N° 42');
    expect(text(fixture)).toContain('Confirmée');
    expect(text(fixture)).toContain('Sans oignons');
    expect(text(fixture)).toContain('Payée par carte');
  });

  it('n’offre pas d’annulation : le client appelle le restaurant ou demande sur place', () => {
    expect(text(fixture)).not.toContain('Annuler la commande');
    expect(fixture.nativeElement.querySelector('dialog')).toBeNull();
    const help = fixture.nativeElement.querySelector('.tracking__cancel-help') as HTMLElement;
    expect(help.textContent?.replace(/\s+/g, ' ')).toContain(
      'Pour annuler, appelez le restaurant par téléphone (01 23 45 67 89) ou demandez directement sur place.',
    );
    expect(help.querySelector('a')?.getAttribute('href')).toBe('tel:0123456789');
  });

  it('se met à jour sur l’événement de la commande et fait vibrer à « Prête »', async () => {
    realtime.emit('OrderStatusChanged', summary({ id: 'autre' }));
    realtime.emit('OrderStatusChanged', summary({ id: 'o1', status: 'Ready' }));
    await answer({ ...online, status: 'Ready' });

    expect(text(fixture)).toContain('Prête — venez la chercher');
    expect(fixture.nativeElement.querySelector('.tracking--ready')).not.toBeNull();
    expect(vibrate).toHaveBeenCalledOnce();
    expect(text(fixture)).toContain('Pour annuler, appelez le restaurant');
  });

  it('relit la commande à la resynchronisation', async () => {
    realtime.resync.next();
    await answer({ ...online, status: 'InPreparation' });
    expect(text(fixture)).toContain('En préparation');
  });

  it('relit toutes les 5 s tant que le paiement en ligne est attendu, puis s’arrête', async () => {
    realtime.resync.next();
    await answer({ ...online, status: 'PendingPayment', isPaid: false });
    expect(text(fixture)).toContain('Nous attendons la confirmation de votre paiement');
    expect(text(fixture)).not.toContain('Payer au retrait');
    expect(text(fixture)).not.toContain('Pour annuler');

    vi.advanceTimersByTime(PAYMENT_POLL_MS);
    await answer({ ...online, status: 'Confirmed' });
    vi.advanceTimersByTime(PAYMENT_POLL_MS * 2);
    TestBed.tick();
    http.expectNone('/orders/o1');
  });

  it('affiche le motif d’une annulation faite par le restaurant', async () => {
    realtime.resync.next();
    await answer({
      ...online,
      status: 'Cancelled',
      history: [
        { status: 'Cancelled', changedAt: online.createdAt, reason: 'Demandé par téléphone' },
      ],
    });
    expect(text(fixture)).toContain('Annulée');
    expect(text(fixture)).toContain('Demandé par téléphone');
    expect(text(fixture)).not.toContain('Pour annuler');
    expect(text(fixture)).toContain('Commander');
  });

  it('signale une commande d’un autre compte', async () => {
    fixture.componentRef.setInput('id', 'o2');
    TestBed.tick();
    http
      .expectOne('/orders/o2')
      .flush({ message: 'Introuvable' }, { status: 404, statusText: 'Not Found' });
    await settle();
    expect(text(fixture)).toContain('Commande introuvable');
  });
});
