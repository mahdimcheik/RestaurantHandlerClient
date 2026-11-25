import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { SessionService } from '../../../../core/auth/session.service';
import { envelope, loginData } from '../../../../core/auth/testing';
import { GoogleIdentityService } from '../../../../core/auth/google-identity.service';
import { fakeRealtime } from '../../../../core/realtime/testing';
import { GoogleSignIn } from '../../components/google-sign-in';
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
        {
          provide: GoogleIdentityService,
          useValue: { enabled: true, renderButton: () => Promise.resolve() },
        },
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

  const googleButton = () =>
    fixture.debugElement.query(By.directive(GoogleSignIn)).componentInstance as GoogleSignIn;

  /** ID token factice : seul le payload (e-mail) est lu par la page. */
  const idToken = `h.${btoa(JSON.stringify({ email: 'jean@gmail.com' }))}.s`;

  const unknownGoogleAccount = async () => {
    googleButton().credential.emit(idToken);
    const request = http.expectOne('/auth/google');
    expect(request.request.body).toEqual({ idToken });
    request.flush({ message: 'Aucun compte', status: 428 }, { status: 400, statusText: '' });
    await fixture.whenStable();
  };

  it('propose de finaliser le compte quand le compte Google est inconnu', async () => {
    await unknownGoogleAccount();

    expect(text(fixture)).toContain('Finaliser votre compte');
    expect(text(fixture)).toContain('jean@gmail.com');
    expect(text(fixture)).toContain('En continuant avec Google, vous acceptez');
    expect((fixture.nativeElement as HTMLElement).querySelector('[role=alert]')).toBeNull();
  });

  it('crée le compte avec le même jeton et les consentements', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await unknownGoogleAccount();
    button('Créer mon compte').click();

    const request = http.expectOne('/auth/google');
    expect(request.request.body).toEqual({
      idToken,
      termsConsent: true,
      privacyPolicyConsent: true,
      dataProcessingConsent: true,
    });
    request.flush(envelope(loginData()));
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalled();
  });

  it('referme la carte et affiche l’erreur si le jeton a expiré', async () => {
    await unknownGoogleAccount();
    button('Créer mon compte').click();
    http
      .expectOne('/auth/google')
      .flush({ message: 'Connexion Google échouée', status: 401 }, { status: 400, statusText: '' });
    await fixture.whenStable();

    expect(text(fixture)).toContain('Connexion Google échouée');
    expect(text(fixture)).not.toContain('Finaliser votre compte');
  });

  it('revient à la connexion sur « Annuler »', async () => {
    await unknownGoogleAccount();
    button('Annuler').click();
    await fixture.whenStable();

    expect(text(fixture)).not.toContain('Finaliser votre compte');
    expect((fixture.nativeElement as HTMLElement).querySelector('form')).not.toBeNull();
  });

  const button = (label: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) =>
      b.textContent?.includes(label),
    )!;
});
