import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideServiceWorker } from '@angular/service-worker';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { envelope } from './shared/testing';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideServiceWorker('ngsw-worker.js', { enabled: false }),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render header, main and footer', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    // Le pied de page charge le nom et les coordonnées du restaurant.
    TestBed.inject(HttpTestingController)
      .match(() => true)
      .forEach((request) =>
        request.flush(envelope({ tradeName: 'Chez Nino', hours: [], upcomingClosures: [] })),
      );
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-site-header header')).toBeTruthy();
    expect(el.querySelector('main#contenu')).toBeTruthy();
    expect(el.querySelector('app-site-footer footer')?.textContent).toContain('Chez Nino');
    expect(el.querySelector('app-site-footer app-theme-switcher')).toBeNull();
  });
});
