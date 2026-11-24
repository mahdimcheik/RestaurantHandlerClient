import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { envelope } from '../../../../core/auth/testing';
import { fakeRealtime } from '../../../../core/realtime/testing';
import { flushRestaurantInfo, submitForm, text, typeInto } from '../../testing';
import { RegisterPage } from './register-page';

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
});
