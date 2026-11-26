import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OrderDetails } from '../../../../core/api/generated';
import { fakeRealtime } from '../../../../core/realtime/testing';
import { APPROVAL_SOUND } from '../../../../shared/services/approval-alert.service';
import { envelope, order, polyfillDialog, summary, text } from '../../../../shared/testing';
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
const kebab = order({
  id: 'd',
  dailyNumber: 30,
  status: 'AwaitingApproval',
  paymentChoice: 'OnSite',
  totalCents: 2350,
  items: [
    {
      id: 'i2',
      name: 'Kebab',
      quantity: 1,
      unitPriceCents: 2350,
      lineTotalCents: 2350,
      components: [],
      modifications: [],
    },
  ],
});

const paidReady = order({
  id: 'r',
  dailyNumber: 7,
  status: 'Ready',
  channel: 'Online',
  paymentChoice: 'Online',
  customerLabel: 'Inès',
  isPaid: true,
  paidCents: 1850,
  payments: [{ id: 'p1', method: 'SumupOnline', status: 'Successful', amountCents: 1850 }],
});
const unpaidReady = order({ id: 's', dailyNumber: 8, status: 'Ready', totalCents: 1200 });

describe('KitchenPage', () => {
  let fixture: ComponentFixture<KitchenPage>;
  let http: HttpTestingController;
  let realtime: ReturnType<typeof fakeRealtime>;
  let sound: ReturnType<typeof vi.fn>;
  let approvalSound: ReturnType<typeof vi.fn>;
  /** Commandes à valider renvoyées par l'API. */
  let waiting: OrderDetails[];
  /** Commandes prêtes renvoyées par l'API. */
  let ready: OrderDetails[];

  beforeAll(polyfillDialog);

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
  const band = () => root().querySelector('[aria-labelledby="kds-approval"]')?.textContent ?? '';
  const dialog = () => root().querySelector('dialog[open]') as HTMLDialogElement | null;
  const openDetails = (dailyNumber: number) => {
    const button = [...root().querySelectorAll('button')].find((b) =>
      (b.textContent ?? '').replace(/\s+/g, ' ').includes(`de la commande n° ${dailyNumber} `),
    );
    if (!button) {
      throw new Error(`Commande n° ${dailyNumber} introuvable.`);
    }
    button.click();
  };
  /** Répond aux relectures d'une commande ouverte en détail. */
  const answerDetail = async (details: OrderDetails) => {
    TestBed.tick();
    http.expectOne(`/manage/orders/${details.id}`).flush(envelope(details));
    await settle();
  };
  const answerApprovals = async () => {
    TestBed.tick();
    for (const request of http.match((r) => r.url === '/manage/orders')) {
      const status = request.request.params.get('Status');
      if (status === 'Ready') {
        request.flush(envelope(ready.map((details) => summary(details))));
      } else {
        expect(status).toBe('AwaitingApproval');
        request.flush(envelope(waiting.map(({ id, pickupAt }) => ({ id, pickupAt }))));
      }
    }
    await settle();
    for (const pending of waiting) {
      for (const request of http.match(
        (r) => r.method === 'GET' && r.url === `/manage/orders/${pending.id}`,
      )) {
        request.flush(envelope(pending));
      }
    }
    await settle();
  };
  const answer = async (queue: OrderDetails[]) => {
    TestBed.tick();
    http.expectOne('/manage/orders/kitchen').flush(envelope(queue));
    await settle();
    await answerApprovals();
  };

  beforeEach(async () => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    realtime = fakeRealtime();
    sound = vi.fn();
    approvalSound = vi.fn();
    waiting = [];
    ready = [];
    TestBed.configureTestingModule({
      imports: [KitchenPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        realtime.provider,
        { provide: KITCHEN_SOUND, useValue: sound },
        { provide: APPROVAL_SOUND, useValue: approvalSound },
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

  describe('commandes à valider', () => {
    beforeEach(async () => {
      expect(band()).toBe('');
      waiting = [kebab];
      realtime.emit('OrderAwaitingApproval', {});
      await answer([burger, pizza]);
    });

    it('les montre au-dessus des colonnes, avec un carillon', () => {
      expect(band()).toContain('À valider');
      expect(band()).toContain('30');
      expect(band()).toContain('1× Kebab');
      expect(band()).toContain('À payer au retrait');
      expect(band()).toMatch(/23,50\s€/);
      expect(approvalSound).toHaveBeenCalledTimes(1);
      expect(sound).not.toHaveBeenCalled();
    });

    it("accepte d'une touche : la commande passe à préparer sans carillon", async () => {
      press('Accepter');
      TestBed.tick();
      const accept = http.expectOne('/manage/orders/d/accept');
      expect(accept.request.method).toBe('POST');
      waiting = [];
      accept.flush(envelope({ ...kebab, status: 'Confirmed' }));
      await answer([burger, pizza, { ...kebab, status: 'Confirmed' }]);

      expect(band()).toBe('');
      expect(column('kds-todo')).toContain('Kebab');
      expect(text(fixture)).toContain('N° 30 acceptée');
      expect(sound).not.toHaveBeenCalled();
      expect(text(fixture)).not.toContain('Annuler (');
    });

    it('refuse avec un motif obligatoire', async () => {
      press('Refuser');
      await settle();
      const dialog = root().querySelector('dialog[open]') as HTMLDialogElement;
      expect(dialog.textContent).toContain('Commande n° 30');
      dialog.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      http.expectNone('/manage/orders/d/refuse');

      const reason = dialog.querySelector('textarea')!;
      reason.value = 'Plus de pâte';
      reason.dispatchEvent(new Event('input'));
      dialog.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      const refuse = http.expectOne('/manage/orders/d/refuse');
      expect(refuse.request.body).toEqual({ reason: 'Plus de pâte' });
      waiting = [];
      refuse.flush(envelope({ ...kebab, status: 'Refused' }));
      await answer([burger, pizza]);

      expect(band()).toBe('');
      expect(text(fixture)).toContain('N° 30 refusée');
    });

    it('prévient si la commande a changé ailleurs', async () => {
      press('Accepter');
      TestBed.tick();
      waiting = [];
      http
        .expectOne('/manage/orders/d/accept')
        .flush(
          { message: 'Transition non autorisée.', status: 409 },
          { status: 409, statusText: 'Conflict' },
        );
      await answer([burger, pizza]);
      expect(text(fixture)).toContain('La commande a changé sur un autre écran');
      expect(band()).toBe('');
    });
  });

  describe('détail avec les prix', () => {
    it("s'ouvre au toucher du numéro, par-dessus l'écran, et se referme", async () => {
      openDetails(12);
      await settle();
      expect(dialog()?.textContent).toContain('Commande n° 12');
      await answerDetail(burger);

      const shown = (dialog()?.textContent ?? '').replace(/\s+/g, ' ');
      expect(shown).toContain('2× Burger');
      expect(shown).toMatch(/18,00\s€/);
      expect(shown).toMatch(/9,00\s€ l'unité/);
      expect(shown).toMatch(/Bacon ×2 \+ 3,00\s€/);
      expect(shown).toContain('Bien cuit');
      expect(shown).toMatch(/Total\s*18,50\s€/);
      expect(shown).toMatch(/Reste à encaisser 18,50\s€/);
      expect(shown).not.toContain('Remis au client');
      expect(column('kds-todo')).toContain('Burger');

      press('Fermer');
      await settle();
      expect(dialog()).toBeNull();
    });

    it("montre la commande déjà à l'écran si la relecture échoue (hors ligne)", async () => {
      openDetails(9);
      await settle();
      http.expectOne('/manage/orders/b').error(new ProgressEvent('error'));
      await settle();
      expect(dialog()?.textContent).toContain('Commande n° 9');
      expect(dialog()?.textContent).toContain('Total');
    });
  });

  describe('commandes prêtes', () => {
    beforeEach(async () => {
      ready = [paidReady, unpaidReady];
      realtime.emit('OrderStatusChanged', {});
      await answer([burger, pizza]);
    });

    it('restent visibles avec leur état de paiement', () => {
      const shown = column('kds-ready').replace(/\s+/g, ' ');
      expect(shown).toMatch(/Prêtes\s*2/);
      expect(shown).toContain('Inès');
      expect(shown).toMatch(/Payée\s*18,50\s€/);
      expect(shown).toMatch(/À encaisser\s*12,00\s€/);
    });

    it('se remettent au client depuis le détail quand elles sont payées', async () => {
      openDetails(7);
      await answerDetail(paidReady);
      expect(dialog()?.textContent).toContain('En ligne');

      press('Remis au client');
      TestBed.tick();
      const complete = http.expectOne('/manage/orders/r/complete');
      expect(complete.request.method).toBe('POST');
      ready = [unpaidReady];
      complete.flush(envelope({ ...paidReady, status: 'Completed' }));
      await answer([burger, pizza]);

      expect(dialog()).toBeNull();
      expect(text(fixture)).toContain('N° 7 remise au client');
      expect(column('kds-ready')).not.toContain('Inès');
    });

    it('renvoient au back-office pour encaisser une commande non payée', async () => {
      openDetails(8);
      await answerDetail(unpaidReady);
      const shown = (dialog()?.textContent ?? '').replace(/\s+/g, ' ');
      expect(shown).toMatch(/Reste à encaisser 12,00\s€/);
      expect(shown).toContain('À encaisser avant la remise');
      expect(shown).not.toContain('Remis au client');
    });
  });
});
