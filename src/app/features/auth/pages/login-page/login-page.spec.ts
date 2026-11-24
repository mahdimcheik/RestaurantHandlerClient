import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SessionService } from '../../../../core/auth/session.service';
import { envelope, loginData } from '../../../../core/auth/testing';
import { fakeRealtime } from '../../../../core/realtime/testing';
import { flushRestaurantInfo, submitForm, text, typeInto } from '../../testing';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        fakeRealtime().provider,
      ],
    });
    fixture = TestBed.createComponent(LoginPage);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    flushRestaurantInfo(http);
    await fixture.whenStable();
  });

  afterEach(() => {
    flushRestaurantInfo(http);
    http.verify();
  });

  it('suit le nouveau design : barre du haut, un seul titre, bouton plein', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.brand.brand-ui .topbar')).not.toBeNull();
    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(el.querySelector('.auth__card h1')?.textContent).toContain('Connexion');
    expect(el.querySelector('.auth__aside')?.textContent).toContain('Bon retour parmi nous');
    expect(el.querySelector('button[type=submit].btn-brand--solid')).not.toBeNull();
  });

  it('refuse un formulaire invalide sans appeler l’API', async () => {
    typeInto(fixture, 0, 'pas-un-email');
    submitForm(fixture);
    await fixture.whenStable();

    http.expectNone('/auth/login');
    expect(text(fixture)).toContain('adresse e-mail valide');
    expect(text(fixture)).toContain('Ce champ est obligatoire.');
    const email = (fixture.nativeElement as HTMLElement).querySelector('input');
    expect(email?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(email);
  });

  it('connecte puis revient à la page demandée', async () => {
    fixture.componentRef.setInput('returnUrl', '/commander');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    typeInto(fixture, 0, 'a@b.fr');
    typeInto(fixture, 1, 'secret123');
    submitForm(fixture);

    const request = http.expectOne('/auth/login');
    expect(request.request.body).toEqual({ email: 'a@b.fr', password: 'secret123' });
    request.flush(envelope(loginData()));
    await fixture.whenStable();

    expect(TestBed.inject(SessionService).isAuthenticated()).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/commander');
  });

  it('affiche le message du serveur en cas d’échec', async () => {
    typeInto(fixture, 0, 'a@b.fr');
    typeInto(fixture, 1, 'mauvais');
    submitForm(fixture);
    http
      .expectOne('/auth/login')
      .flush({ message: 'Identifiants invalides', status: 401 }, { status: 400, statusText: '' });
    await fixture.whenStable();

    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role=alert]');
    expect(alert?.textContent).toContain('Identifiants invalides');
  });
});
