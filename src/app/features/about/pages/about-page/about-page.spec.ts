import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fakeRealtime } from '../../../../core/realtime/testing';
import { envelope, text } from '../../../../shared/testing';
import { AboutPage } from './about-page';

describe('AboutPage', () => {
  it('présente le cuisinier, ses trois engagements et mène à la carte', async () => {
    TestBed.configureTestingModule({
      imports: [AboutPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        fakeRealtime().provider,
      ],
    });
    const fixture = TestBed.createComponent(AboutPage);
    TestBed.tick();
    TestBed.inject(HttpTestingController)
      .expectOne('/restaurant/info')
      .flush(envelope({ tradeName: 'Chez Nino', hours: [], upcomingClosures: [] }));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(el.querySelector('h1')?.textContent).toContain('Un cuisinier');
    expect(text(fixture)).toContain('10');
    expect([...el.querySelectorAll('.pillar h3')].map((h) => h.textContent?.trim())).toEqual([
      'Dix ans de métier',
      'Fait maison',
      'Le contact client',
    ]);
    expect(el.querySelector('.intro a[href="/commander"]')).not.toBeNull();
    expect(el.querySelector('.topbar')).not.toBeNull();
  });
});
