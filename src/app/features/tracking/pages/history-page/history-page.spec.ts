import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { envelope, summary, text } from '../../../../shared/testing';
import { HistoryPage } from './history-page';

describe('HistoryPage', () => {
  it('liste les commandes, la plus récente en premier, page par page', async () => {
    TestBed.configureTestingModule({
      imports: [HistoryPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(HistoryPage);
    const http = TestBed.inject(HttpTestingController);
    const settle = async () => {
      TestBed.tick();
      await new Promise((resolve) => setTimeout(resolve));
      TestBed.tick();
    };
    await settle();
    http
      .expectOne((r) => r.url === '/orders/mine' && r.params.get('page') === '1')
      .flush({
        ...envelope([summary({ id: 'o2', dailyNumber: 7, status: 'Completed', totalCents: 2400 })]),
        count: 25,
      });
    await settle();
    expect(text(fixture)).toContain('N° 7');
    expect(text(fixture)).toContain('Retirée');
    expect(text(fixture)).toContain('24,00');
    expect(text(fixture)).toContain('Page 1 sur 2');
    expect(fixture.nativeElement.querySelector('a.history-list__item').getAttribute('href')).toBe(
      '/commandes/o2',
    );

    const next = [...fixture.nativeElement.querySelectorAll('button')].find((b: HTMLElement) =>
      b.textContent?.includes('Page suivante'),
    ) as HTMLButtonElement;
    next.click();
    await settle();
    http
      .expectOne((r) => r.url === '/orders/mine' && r.params.get('page') === '2')
      .flush({ ...envelope([]), count: 25 });
    await settle();
    expect(text(fixture)).toContain('Page 2 sur 2');
    http.verify();
  });
});
