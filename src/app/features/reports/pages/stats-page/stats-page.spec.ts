import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { PeakHoursReport, ProductSalesReport } from '../../../../core/api/generated';
import { envelope, text } from '../../../../shared/testing';
import { restaurantDay } from '../../../../shared/utils/restaurant-time';
import { StatsPage } from './stats-page';

const settle = async () => {
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
};

const SALES: ProductSalesReport = {
  from: '2026-11-23',
  to: '2026-11-29',
  products: [
    { productId: 'p1', name: 'Classic', quantityAlone: 3, quantityInMenus: 2, revenueCents: 2850 },
  ],
  menus: [{ menuId: 'm1', name: 'Menu Classic', quantity: 2, revenueCents: 2580 }],
  supplements: [],
};

const PEAKS: PeakHoursReport = {
  from: '2026-11-23',
  to: '2026-11-29',
  bucketMinutes: 30,
  buckets: [
    {
      dayOfWeek: 'Monday',
      start: '12:00:00',
      orders: 4,
      revenueCents: 4000,
      averagePreparationMinutes: 11,
    },
    {
      dayOfWeek: 'Tuesday',
      start: '12:00:00',
      orders: 2,
      revenueCents: 2000,
      averagePreparationMinutes: 14,
    },
    { dayOfWeek: 'Tuesday', start: '19:30:00', orders: 3, revenueCents: 3600 },
  ],
};

describe('StatsPage', () => {
  let fixture: ComponentFixture<StatsPage>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  const answer = async (sales = SALES, peaks = PEAKS) => {
    TestBed.tick();
    const salesRequest = http.expectOne((r) => r.url === '/manage/stats/products');
    const peaksRequest = http.expectOne((r) => r.url === '/manage/stats/peak-hours');
    salesRequest.flush(envelope(sales));
    peaksRequest.flush(envelope(peaks));
    await settle();
    return { sales: salesRequest.request, peaks: peaksRequest.request };
  };

  const rows = () =>
    [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll(
        '[aria-labelledby="stats-peaks"] tbody tr',
      ),
    ].map((row) => row.textContent?.replace(/\s+/g, ' ').trim());

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StatsPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(StatsPage);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('demande le jour même par défaut et affiche les ventes', async () => {
    const { sales, peaks } = await answer();
    expect(sales.params.get('Period')).toBe('Day');
    expect(sales.params.get('From')).toBe(restaurantDay());
    expect(sales.params.has('To')).toBe(false);
    expect(peaks.params.get('BucketMinutes')).toBe('30');
    expect(text(fixture)).toContain('Classic');
    expect(text(fixture)).toContain('Menu Classic');
    expect(text(fixture)).toContain('Aucun supplément vendu');
  });

  it('lit la période libre dans l’adresse', async () => {
    fixture.componentRef.setInput('periode', 'Custom');
    fixture.componentRef.setInput('du', '2026-11-01');
    fixture.componentRef.setInput('au', '2026-11-15');
    const { sales } = await answer();
    expect(sales.params.get('Period')).toBe('Custom');
    expect(sales.params.get('To')).toBe('2026-11-15');
  });

  it('cumule les jours par tranche puis filtre un jour de semaine', async () => {
    await answer();
    expect(rows()).toEqual([
      expect.stringContaining('12:00 – 12:30 6'),
      expect.stringContaining('19:30 – 20:00 3'),
    ]);
    expect(rows()[0]).toContain('12 min');

    fixture.componentRef.setInput('jour', 'Tuesday');
    await settle();
    expect(rows()).toEqual([
      expect.stringContaining('12:00 – 12:30 2'),
      expect.stringContaining('19:30 – 20:00 3'),
    ]);
  });

  it('change de période par l’adresse', async () => {
    await answer();
    const week = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('input[name="stats-period"]'),
    ][1] as HTMLInputElement;
    week.click();
    expect(navigate).toHaveBeenCalledWith([], {
      queryParams: { periode: 'Week', du: restaurantDay(), au: null },
      queryParamsHandling: 'merge',
    });
  });

  it('affiche le message de l’API en cas d’erreur', async () => {
    TestBed.tick();
    http
      .expectOne((r) => r.url === '/manage/stats/products')
      .flush(
        { message: 'Période trop longue', status: 400 },
        { status: 400, statusText: 'Bad Request' },
      );
    http.expectOne((r) => r.url === '/manage/stats/peak-hours').flush(envelope(PEAKS));
    await settle();
    expect(text(fixture)).toContain('Période trop longue');
  });
});
