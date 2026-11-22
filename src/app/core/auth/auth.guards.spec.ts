import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { authGuard, guestGuard } from './auth.guards';
import { safeReturnUrl } from './return-url';
import { SessionService } from './session.service';

describe('gardes d’authentification', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/commandes' } as RouterStateSnapshot;
  let authenticated = false;

  beforeEach(() => {
    authenticated = false;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: SessionService, useValue: { isAuthenticated: () => authenticated } },
      ],
    });
  });

  it('authGuard renvoie un visiteur vers la connexion avec la page demandée', () => {
    const result = TestBed.runInInjectionContext(() => authGuard(route, state)) as UrlTree;
    expect(result.toString()).toBe('/auth/connexion?returnUrl=%2Fcommandes');
  });

  it('authGuard laisse passer un utilisateur connecté', () => {
    authenticated = true;
    expect(TestBed.runInInjectionContext(() => authGuard(route, state))).toBe(true);
  });

  it('guestGuard renvoie un utilisateur connecté à l’accueil', () => {
    authenticated = true;
    const result = TestBed.runInInjectionContext(() => guestGuard(route, state)) as UrlTree;
    expect(result.toString()).toBe('/');
  });
});

describe('safeReturnUrl', () => {
  it('n’accepte que les chemins internes', () => {
    expect(safeReturnUrl('/commander?x=1')).toBe('/commander?x=1');
    expect(safeReturnUrl('//evil.example')).toBe('/');
    expect(safeReturnUrl('/\\evil.example')).toBe('/');
    expect(safeReturnUrl('https://evil.example')).toBe('/');
    expect(safeReturnUrl(undefined)).toBe('/');
  });
});
