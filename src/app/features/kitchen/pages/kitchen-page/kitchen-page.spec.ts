import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OrderDetails } from '../../../../core/api/generated';
import { fakeRealtime } from '../../../../core/realtime/testing';
import { envelope, order, text } from '../../../../shared/testing';
import { KITCHEN_SOUND, UNDO_WINDOW_MS } from '../../data-access/kitchen-board';
import { KitchenPage } from './kitchen-page';

const settle = async () => {
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
};

const burger = order({
  id: 'a',
  dailyNumber: 12,
  status: 'Confirmed',
  customerNote: 'Bien cuit',
  items: [
    {
      id: 'i1',
      name: 'Burger',
      quantity: 2,
      unitPriceCents: 900,
      lineTotalCents: 1800,
      components: [],
      modifications: [
        { type: 'Remove', label: 'Sans oignons', quantity: 1, unitPriceCents: 0 },
        { type: 'Supplement', label: 'Bacon', quantity: 2, unitPriceCents: 150 },
      ],
    },
  ],
});
const pizza = order({ id: 'b', dailyNumber: 9, status: 'InPreparation' });

describe('KitchenPage', () => {
  let fixture: ComponentFixture<KitchenPage>;
  let http: HttpTestingController;
  let realtime: ReturnType<typeof fakeRealtime>;
  let sound: ReturnType<typeof vi.fn>;

  const root = () => fixture.nativeElement as HTMLElement;
  const column = (id: string) =>
    root().querySelector(`[aria-labelledby="${id}"]`)?.textContent ?? '';
  const press = (label: string) => {
    const button = [...root().querySelectorAll('button')].find((b) =>
      b.textContent?.includes(label),
    );
    if (!button) {
      throw new Error(`Bouton « ${label} » introuvable.`);
    }
    button.click();
  };
  const answer = async (queue: OrderDetails[]) => {
    TestBed.tick();
    http.expectOne('/manage/orders/kitchen').flush(envelope(queue));
    await settle();
  };

  beforeEach(async () => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    realtime = fakeRealtime();
    sound = vi.fn();
    TestBed.configureTestingModule({
      imports: [KitchenPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        realtime.provider,
        { provide: KITCHEN_SOUND, useValue: sound },
      ],
    });
    fixture = TestBed.createComponent(KitchenPage);
    http = TestBed.inject(HttpTestingController);
    await answer([burger, pizza]);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('montre les commandes en deux colonnes avec leurs personnalisations', () => {
    expect(column('kds-todo')).toContain('12');
    expect(column('kds-todo')).toContain('2× Burger');
    expect(column('kds-todo')).toContain('Bacon ×2');
    expect(column('kds-todo')).toContain('Bien cuit');
    expect(column('kds-cooking')).toContain('9');
    expect(root().querySelector('.kds-ticket__mod--strong')?.textContent).toContain('Sans oignons');
    expect(sound).not.toHaveBeenCalled();
  });

  it("commence une commande d'une touche, puis propose d'annuler le geste", async () => {
    press('Commencer');
    TestBed.tick();
    const start = http.expectOne('/manage/orders/a/start');
    expect(start.request.method).toBe('POST');
    start.flush(envelope({ ...burger, status: 'InPreparation' }));
    await answer([{ ...burger, status: 'InPreparation' }, pizza]);

    expect(column('kds-cooking')).toContain('Burger');
    expect(text(fixture)).toContain('N° 12 : En préparation');
    expect(text(fixture)).toContain('Annuler (9 s)');

    press('Annuler');
    TestBed.tick();
    http.expectOne('/manage/orders/a/undo').flush(envelope(burger));
    await answer([burger, pizza]);
    expect(column('kds-todo')).toContain('Burger');
    expect(text(fixture)).not.toContain('Annuler (');
  });

  it("retire la proposition d'annulation passé le délai", async () => {
    press('Prête');
    TestBed.tick();
    http.expectOne('/manage/orders/b/ready').flush(envelope({ ...pizza, status: 'Ready' }));
    await answer([burger]);
    expect(text(fixture)).toContain('N° 9 : Prête');

    vi.advanceTimersByTime(UNDO_WINDOW_MS);
    await settle();
    expect(text(fixture)).not.toContain('N° 9 : Prête');
  });

  it('refuse visiblement un geste tenté sans réseau', async () => {
    press('Commencer');
    TestBed.tick();
    http.expectOne('/manage/orders/a/start').error(new ProgressEvent('error'));
    await answer([burger, pizza]);
    expect(root().querySelector('[role="alert"]')?.textContent).toContain(
      "le geste n'a pas été enregistré",
    );
    expect(column('kds-todo')).toContain('Burger');
  });

  it('prévient et relit la file si la commande a changé ailleurs', async () => {
    press('Prête');
    TestBed.tick();
    http
      .expectOne('/manage/orders/b/ready')
      .flush(
        { message: 'Transition non autorisée.', status: 409 },
        { status: 409, statusText: 'Conflict' },
      );
    await answer([burger]);
    expect(text(fixture)).toContain('La commande a changé sur un autre écran');
  });

  it('relit la file à la reconnexion et sonne pour une nouvelle commande', async () => {
    realtime.resync.next();
    const fries = order({ id: 'c', dailyNumber: 15 });
    await answer([burger, pizza, fries]);
    expect(column('kds-todo')).toContain('15');
    expect(sound).toHaveBeenCalledTimes(1);
    expect(text(fixture)).toContain('Nouvelle commande n° 15');

    realtime.emit('OrderStatusChanged', {});
    await answer([burger, pizza, fries]);
    expect(sound).toHaveBeenCalledTimes(1);
  });

  it('se tait quand le son est coupé', async () => {
    press('Son des nouvelles commandes');
    realtime.emit('OrderCreated', {});
    await answer([burger, pizza, order({ id: 'c', dailyNumber: 15 })]);
    expect(sound).not.toHaveBeenCalled();
    expect(localStorage.getItem('rh.kitchen-sound')).toBe('off');
  });

  it('relit la file chaque minute', async () => {
    vi.advanceTimersByTime(60_000);
    await answer([burger, pizza]);
  });
});
