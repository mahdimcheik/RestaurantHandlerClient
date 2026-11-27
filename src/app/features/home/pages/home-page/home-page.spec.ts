import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RestaurantInfo } from '../../../../core/api/generated';
import { fakeRealtime } from '../../../../core/realtime/testing';
import { envelope, text } from '../../../../shared/testing';
import { HOME_HERO, HomeHero } from '../../home-hero';
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

function configure(hero: HomeHero) {
  TestBed.configureTestingModule({
    imports: [HomePage],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      fakeRealtime().provider,
      { provide: HOME_HERO, useValue: hero },
    ],
  });
}

describe('HomePage', () => {
  it('affiche le carrousel au nom du restaurant, son état d’ouverture et les infos pratiques', async () => {
    configure('carousel');
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
    expect(el.querySelector('.showcase a[href="/commander"]')).not.toBeNull();
    expect(el.querySelector('.showcase a[href="/panier"]')).not.toBeNull();
    expect(el.querySelector('.showcase__pause')?.textContent).toContain('pause');
    expect(el.querySelector('#infos')?.textContent).toContain('Ouvert');
    expect(text(fixture)).toContain('3 place du Marché');
    expect(text(fixture)).toContain('11:30 – 14:30');
    expect(text(fixture)).toContain('Noël');
    expect(el.querySelector('a[href^="tel:"]')).not.toBeNull();

    // Contact : appeler et venir (téléphone et adresse connus) ; ni e-mail ni Instagram renseignés.
    const cards = [...el.querySelectorAll<HTMLAnchorElement>('#contact .contact__card')];
    expect(cards.map((card) => card.querySelector('.visit__title')?.textContent?.trim())).toEqual([
      'Appeler',
      'Venir',
    ]);
    expect(cards[0].getAttribute('href')).toBe('tel:0400000000');
    expect(cards[1].getAttribute('href')).toContain(encodeURIComponent('3 place du Marché'));
    expect(cards[1].getAttribute('target')).toBe('_blank');
    expect(el.querySelector('#contact a[href^="mailto:"]')).toBeNull();
    http.verify();
  });

  it('affiche les diapositives quand HOME_HERO vaut « slider »', async () => {
    configure('slider');
    const fixture = TestBed.createComponent(HomePage);
    const http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    http.expectOne('/restaurant/info').flush(envelope(info));
    http
      .expectOne('/restaurant/status')
      .flush(envelope({ status: 'Open', closesAt: '2026-11-23T13:30:00Z', asapDelayMinutes: 15 }));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.showcase')).toBeNull();
    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(el.querySelector('.brand-slider h1')?.textContent).toContain('Chez Nino');
    expect(el.querySelector('.brand-slider .topbar')).not.toBeNull();
    expect(el.querySelector('#infos')).not.toBeNull();
    http.verify();
  });
});
