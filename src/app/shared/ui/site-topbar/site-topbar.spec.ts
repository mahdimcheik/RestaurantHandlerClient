import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Provider, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionService } from '../../../core/auth/session.service';
import { fakeRealtime } from '../../../core/realtime/testing';
import { envelope } from '../../testing';
import { NotificationCenter } from '../../services/notification-center.service';
import { TabBarState } from '../../services/tab-bar.service';
import { SiteTopbar } from './site-topbar';

describe('SiteTopbar', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  async function setup(providers: Provider[] = [], tabs = true) {
    TestBed.configureTestingModule({
      imports: [SiteTopbar],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
        fakeRealtime().provider,
        ...providers,
      ],
    });
    const fixture = TestBed.createComponent(SiteTopbar);
    fixture.componentRef.setInput('tabs', tabs);
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

  it('demande la barre d’onglets du bas et la rend en partant, sauf si la page la retire', async () => {
    const { fixture } = await setup();
    const state = TestBed.inject(TabBarState);
    expect(state.visible()).toBe(true);
    fixture.destroy();
    expect(state.visible()).toBe(false);
  });

  it('ne demande pas la barre d’onglets quand la page la retire', async () => {
    await setup([], false);
    expect(TestBed.inject(TabBarState).visible()).toBe(false);
  });

  it('cache Commander et le panier au Manager', async () => {
    const { el } = await setup([
      {
        provide: SessionService,
        useValue: {
          user: signal({ id: 'm1', firstName: 'Mia', roles: [{ name: 'Manager' }] }),
          isManager: signal(true),
          isAuthenticated: signal(true),
        },
      },
    ]);
    expect(el.querySelector('a[href="/commander"]')).toBeNull();
    expect(el.querySelector('a[href="/panier"]')).toBeNull();
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

  // Réactiver avec SHOW_THEME_MENU dans site-topbar.ts.
  it.skip('change le thème et n’ouvre qu’un menu à la fois', async () => {
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

  it('n’affiche pas la cloche à un visiteur', async () => {
    const { button } = await setup();
    expect(button('topbar-notifications')).toBeNull();
  });

  it('affiche la cloche du client avec ses non-lues, et marque lue celle qu’il ouvre', async () => {
    const center = {
      enabled: signal(true),
      unread: signal(2),
      items: signal([
        { id: 'n1', message: 'Commande n° 42 prête.', isSeen: false, link: '/commandes/o1' },
        { id: 'n2', message: 'Commande n° 41 en préparation.', isSeen: true, link: null },
      ]),
      markSeen: vi.fn(),
      markAllSeen: vi.fn(),
    };
    const { el, button, click } = await setup([{ provide: NotificationCenter, useValue: center }]);
    const bell = button('topbar-notifications');
    expect(bell.textContent).toContain('Notifications, 2 non lues');
    expect(el.querySelector('.topbar__badge')?.textContent?.trim()).toBe('2');

    click(bell);
    const items = el.querySelectorAll<HTMLAnchorElement>('.notif-list__item');
    expect(items[0].classList).toContain('notif-list__item--unread');
    expect(items[0].textContent).toContain('Non lue');
    expect(items[0].getAttribute('href')).toBe('/commandes/o1');
    expect(items[1].getAttribute('href')).toBe('/commandes');

    click([...el.querySelectorAll<HTMLButtonElement>('.notif-panel__all')][0]);
    expect(center.markAllSeen).toHaveBeenCalled();

    click(items[0]);
    expect(center.markSeen).toHaveBeenCalledWith('n1');
    expect(el.querySelector('#topbar-notifications')).toBeNull();
  });
});
