import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { envelope, loginData } from '../../../../core/auth/testing';
import { GoogleIdentityService } from '../../../../core/auth/google-identity.service';
import { fakeRealtime } from '../../../../core/realtime/testing';
import { GoogleSignIn } from '../../components/google-sign-in';
import { flushRestaurantInfo, submitForm, text, typeInto } from '../../testing';
import { RegisterPage } from './register-page';
import { provideNoNotifications } from '../../../../shared/testing';

describe('RegisterPage', () => {
  let fixture: ComponentFixture<RegisterPage>;
  let http: HttpTestingController;

  const fillIdentity = () => {
    typeInto(fixture, 0, 'Ana');
    typeInto(fixture, 1, 'B');
    typeInto(fixture, 2, 'ana@b.fr');
    typeInto(fixture, 3, 'secret123');
  };

  const checkAll = () =>
    (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLInputElement>('input[type=checkbox]')
      .forEach((box) => box.click());

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        fakeRealtime().provider,
        provideNoNotifications(),
        {
          provide: GoogleIdentityService,
          useValue: { enabled: true, renderButton: () => Promise.resolve() },
        },
      ],
    });
    fixture = TestBed.createComponent(RegisterPage);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    flushRestaurantInfo(http);
    await fixture.whenStable();
  });

  afterEach(() => {
    flushRestaurantInfo(http);
    http.verify();
  });

  it('exige les consentements, un mot de passe de 8 caractères et une adresse sans +', async () => {
    typeInto(fixture, 2, 'ana+test@b.fr');
    typeInto(fixture, 3, 'court');
    submitForm(fixture);
    await fixture.whenStable();

    http.expectNone('/auth/register');
    expect(text(fixture)).toContain('Au moins 8 caractères.');
    expect(text(fixture)).toContain('ne doit pas contenir de « + »');
    expect(text(fixture)).toContain('conditions générales');
  });

  it('crée le compte puis invite à vérifier ses e-mails', async () => {
    fillIdentity();
    checkAll();
    submitForm(fixture);

    const request = http.expectOne('/auth/register');
    expect(request.request.body).toEqual({
      firstName: 'Ana',
      lastName: 'B',
      email: 'ana@b.fr',
      password: 'secret123',
      termsConsent: true,
      privacyPolicyConsent: true,
      dataProcessingConsent: true,
    });
    request.flush(envelope({ id: 'u1' }));
    await fixture.whenStable();

    expect(text(fixture)).toContain('Vérifiez vos e-mails');
    expect(text(fixture)).toContain('ana@b.fr');
  });

  it('met Google en tête, avec la mention qui vaut acceptation', () => {
    const el = fixture.nativeElement as HTMLElement;
    const google = el.querySelector('app-google-sign-in');
    expect(google?.compareDocumentPosition(el.querySelector('form')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(google?.textContent).toContain('En continuant avec Google, vous acceptez');
  });

  it('crée le compte Google sans case à cocher, consentements envoyés', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    googleButton().credential.emit('id-token');

    const request = http.expectOne('/auth/google');
    expect(request.request.body).toEqual({
      idToken: 'id-token',
      termsConsent: true,
      privacyPolicyConsent: true,
      dataProcessingConsent: true,
    });
    request.flush(envelope(loginData()));
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalled();
  });

  const googleButton = () =>
    fixture.debugElement.query(By.directive(GoogleSignIn)).componentInstance as GoogleSignIn;
});
