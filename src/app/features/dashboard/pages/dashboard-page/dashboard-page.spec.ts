import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fakeRealtime } from '../../../../core/realtime/testing';
import { DashboardStats } from '../../../../core/api/generated';
import { OpeningStateService } from '../../../../shared/services/opening-state.service';
import { envelope, text } from '../../../../shared/testing';
import { DashboardPage } from './dashboard-page';

const settle = async () => {
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
};

const TODAY: DashboardStats = {
  date: '2026-11-23',
  orders: 3,
  revenueCents: 4560,
  averageBasketCents: 1520,
  counter: { orders: 2, revenueCents: 2200 },
  online: { orders: 1, revenueCents: 2360 },
  paidOnlineCents: 2360,
  paidOnSiteCents: 2200,
  byStatus: { AwaitingApproval: 1, InPreparation: 2, Cancelled: 1 },
  vat: [{ rate: 5.5, netCents: 237, vatCents: 13, grossCents: 250 }],
};

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let http: HttpTestingController;
  let realtime: ReturnType<typeof fakeRealtime>;

  /** Les caches de la carte partent à leur rythme : réponses vides, sans les vérifier. */
  const flushCatalog = () => {
    for (const request of http.match((r) => r.url !== '/manage/stats/dashboard')) {
      request.flush(envelope([]));
    }
  };

  const answerDashboard = async (stats = TODAY) => {
    TestBed.tick();
    http.expectOne('/manage/stats/dashboard').flush(envelope(stats));
    await settle();
    flushCatalog();
    await settle();
  };

  beforeEach(async () => {
    realtime = fakeRealtime();
    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        realtime.provider,
        { provide: OpeningStateService, useValue: { state: signal(null), load: () => {} } },
      ],
    });
    fixture = TestBed.createComponent(DashboardPage);
    http = TestBed.inject(HttpTestingController);
    await answerDashboard();
  });

  afterEach(() => http.verify());

  it('affiche les chiffres du jour tels que l’API les donne', () => {
    const page = text(fixture).replace(/\s/g, '');
    expect(page).toContain('45,60');
    expect(page).toContain('15,20');
    expect(page).toContain('Comptoir22,00€2commandes');
    expect(page).toContain('Enligne23,60€1commande');
    expect(page).toContain('Payésurplace22,00€');
    expect(page).toContain('Àvalider1');
    expect(page).toContain('Annulée1');
    expect(page).toContain('Refusée0');
    expect(page).toContain('5,5%2,37€0,13€2,50€');
  });

  it('salue et marque les étapes qui ont des commandes', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Bonjour');
    const active = [...el.querySelectorAll('.step-counts__item--active dt')].map((dt) =>
      dt.textContent?.trim(),
    );
    expect(active).toHaveLength(3);
  });

  it('relit les chiffres à chaque événement de commande', async () => {
    realtime.emit('OrderStatusChanged', {});
    await answerDashboard({ ...TODAY, orders: 4 });
    realtime.resync.next();
    await answerDashboard();
  });
});
