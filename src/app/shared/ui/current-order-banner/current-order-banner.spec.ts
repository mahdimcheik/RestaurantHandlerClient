import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionService } from '../../../core/auth/session.service';
import { fakeRealtime } from '../../../core/realtime/testing';
import { envelope, summary } from '../../testing';
import { CurrentOrderBanner } from './current-order-banner';

describe('CurrentOrderBanner', () => {
  const setup = (manager: boolean) => {
    const realtime = fakeRealtime();
    TestBed.configureTestingModule({
      imports: [CurrentOrderBanner],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        realtime.provider,
        {
          provide: SessionService,
          useValue: { user: signal({ id: 'u1' }), isManager: signal(manager) },
        },
      ],
    });
    const fixture = TestBed.createComponent(CurrentOrderBanner);
    return { fixture, realtime, http: TestBed.inject(HttpTestingController) };
  };
  const settle = async () => {
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
  };

  it('annonce la commande en cours et suit son statut', async () => {
    const { fixture, realtime, http } = setup(false);
    await settle();
    http
      .expectOne('/orders/mine/current')
      .flush(envelope([summary({ id: 'o1', dailyNumber: 42, status: 'InPreparation' })]));
    await settle();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a.current-order');
    expect(link?.textContent).toContain('Commande n° 42 — En préparation');
    expect(link?.getAttribute('href')).toBe('/commandes/o1');

    realtime.emit('OrderStatusChanged', summary({ id: 'o1', status: 'Ready' }));
    await settle();
    http
      .expectOne('/orders/mine/current')
      .flush(envelope([summary({ id: 'o1', dailyNumber: 42, status: 'Ready' })]));
    await settle();
    expect(fixture.nativeElement.querySelector('.current-order--ready')?.textContent).toContain(
      'Prête',
    );
    http.verify();
  });

  it('ne demande rien pour un Manager', async () => {
    const { fixture, http } = setup(true);
    await settle();
    http.expectNone('/orders/mine/current');
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });
});
