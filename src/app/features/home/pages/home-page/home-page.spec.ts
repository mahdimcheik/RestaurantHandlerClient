import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RestaurantInfo } from '../../../../core/api/generated';
import { fakeRealtime } from '../../../../core/realtime/testing';
import { envelope, text } from '../../../../shared/testing';
import { HomePage } from './home-page';

const info: RestaurantInfo = {
  tradeName: 'Chez Nino',
  address: '3 place du Marché, 69000 Lyon',
  phone: '04 00 00 00 00',
  hours: [{ dayOfWeek: 'Tuesday', start: '11:30:00', end: '14:30:00' }],
  upcomingClosures: [
    {
      id: 'f1',
      startLocal: '2026-12-24T00:00:00',
      endLocal: '2026-12-26T00:00:00',
      reason: 'Noël',
    },
  ],
};

describe('HomePage', () => {
  it('affiche le restaurant de l’API, son état d’ouverture et le lien vers la carte', async () => {
    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        fakeRealtime().provider,
      ],
    });
    const fixture = TestBed.createComponent(HomePage);
    const http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    http.expectOne('/restaurant/info').flush(envelope(info));
    http
      .expectOne('/restaurant/status')
      .flush(envelope({ status: 'Open', closesAt: '2026-11-23T13:30:00Z', asapDelayMinutes: 15 }));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(el.querySelector('h1')?.textContent).toContain('Chez Nino');
    expect(el.querySelector('a.btn')?.getAttribute('href')).toBe('/commander');
    expect(text(fixture)).toContain('Ouvert');
    expect(text(fixture)).toContain('3 place du Marché');
    expect(text(fixture)).toContain('11:30 – 14:30');
    expect(text(fixture)).toContain('Noël');
    expect(el.querySelector('a[href^="tel:"]')).not.toBeNull();
    http.verify();
  });
});
