import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fakeRealtime } from '../../../core/realtime/testing';
import { envelope } from '../../testing';
import { SiteTopbar } from './site-topbar';

describe('SiteTopbar', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  async function setup() {
    TestBed.configureTestingModule({
      imports: [SiteTopbar],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        fakeRealtime().provider,
      ],
    });
    const fixture = TestBed.createComponent(SiteTopbar);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne('/restaurant/info')
      .flush(envelope({ tradeName: 'Chez Nino', hours: [], upcomingClosures: [] }));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const button = (id: string) =>
      el.querySelector<HTMLButtonElement>(`button[aria-controls="${id}"]`)!;
    const click = (target: HTMLElement) => {
      target.click();
      fixture.detectChanges();
    };
    return { fixture, el, button, click };
  }

  it('affiche le nom du restaurant, la navigation, Commander et le panier', async () => {
    const { el } = await setup();
    expect(el.querySelector('.topbar__brand')?.textContent).toContain('Chez Nino');
    const nav = [...el.querySelectorAll('.topbar__nav a')].map((a) => a.textContent?.trim());
    expect(nav).toEqual(['Accueil', 'Carte', 'À propos']);
    expect(el.querySelector('.topbar__end a[href="/commander"]')?.textContent).toContain(
      'Commander',
    );
    expect(el.querySelector('a[href="/panier"]')?.getAttribute('aria-label')).toBe('Panier');
  });

  it('propose la connexion à un visiteur, puis ferme le menu avec Échap', async () => {
    const { el, button, click } = await setup();
    const account = button('topbar-account');
    expect(account.getAttribute('aria-expanded')).toBe('false');

    click(account);
    expect(account.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('#topbar-account a[href="/auth/connexion"]')).not.toBeNull();
    expect(el.querySelector('#topbar-account a[href="/auth/inscription"]')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    TestBed.tick();
    expect(account.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(account);
  });

  it('change le thème et n’ouvre qu’un menu à la fois', async () => {
    const { el, button, click } = await setup();
    click(button('topbar-account'));
    click(button('topbar-theme'));
    expect(el.querySelector('#topbar-account')).toBeNull();

    const options = el.querySelectorAll<HTMLButtonElement>('#topbar-theme button');
    expect([...options].map((o) => o.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
    ]);
    click(options[2]);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(el.querySelector('#topbar-theme')).toBeNull();
    expect(button('topbar-theme').textContent).toContain('Sombre');
  });
});
