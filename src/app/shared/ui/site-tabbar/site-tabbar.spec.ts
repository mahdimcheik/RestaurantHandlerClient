import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Provider, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionService } from '../../../core/auth/session.service';
import { TabBarState } from '../../services/tab-bar.service';
import { SiteTabbar } from './site-tabbar';

describe('SiteTabbar', () => {
  function setup(providers: Provider[] = [], requested = true) {
    TestBed.configureTestingModule({
      imports: [SiteTabbar],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
        ...providers,
      ],
    });
    if (requested) {
      TestBed.inject(TabBarState).request();
    }
    const fixture = TestBed.createComponent(SiteTabbar);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const labels = () =>
      [...el.querySelectorAll('.tabbar__label')].map((label) => label.textContent?.trim());
    return { fixture, el, labels };
  }

  it('n’apparaît que si une page la demande', () => {
    const { el } = setup([], false);
    expect(el.querySelector('.tabbar')).toBeNull();
  });

  it('propose Accueil, Carte, Commander, Panier et Compte au client', () => {
    const { el, labels } = setup();
    expect(el.querySelector('nav.tabbar')?.getAttribute('aria-label')).toBe('Navigation');
    expect(labels()).toEqual(['Accueil', 'Carte', 'Commander', 'Panier', 'Compte']);
    expect(el.querySelector('.tabbar a[href="/panier"]')).not.toBeNull();
  });

  it('donne au Manager À propos et Gestion à la place de Commander et Panier', () => {
    const { labels } = setup([
      {
        provide: SessionService,
        useValue: {
          user: signal({ id: 'm1', firstName: 'Mia', roles: [{ name: 'Manager' }] }),
          isManager: signal(true),
          isAuthenticated: signal(true),
        },
      },
    ]);
    expect(labels()).toEqual(['Accueil', 'Carte', 'À propos', 'Gestion', 'Compte']);
  });

  it('ouvre le compte avec À propos, puis le ferme avec Échap en rendant le focus', () => {
    const { fixture, el } = setup();
    const account = el.querySelector<HTMLButtonElement>('button[aria-controls="tabbar-account"]')!;
    expect(account.getAttribute('aria-expanded')).toBe('false');

    account.click();
    fixture.detectChanges();
    expect(account.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('#tabbar-account a[href="/auth/connexion"]')).not.toBeNull();
    expect(el.querySelector('#tabbar-account a[href="/a-propos"]')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('#tabbar-account')).toBeNull();
    expect(document.activeElement).toBe(account);
  });
});
