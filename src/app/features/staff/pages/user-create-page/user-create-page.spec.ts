import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { envelope, fill, submitForm, text } from '../../../../shared/testing';
import { account, ROLES } from '../../testing';
import { UserCreatePage } from './user-create-page';

const settle = async () => {
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
};

describe('UserCreatePage', () => {
  let fixture: ComponentFixture<UserCreatePage>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  const fillForm = () => {
    fill(fixture, 'Prénom', 'Sam');
    fill(fixture, 'Nom', 'Petit');
    fill(fixture, 'E-mail', 'sam@exemple.fr');
    fill(fixture, 'Mot de passe', 'motdepasse');
  };
  const consent = () =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [UserCreatePage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(UserCreatePage);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    http.expectOne('/roles/all').flush(envelope(ROLES));
    await settle();
  });

  afterEach(() => http.verify());

  it('exige le consentement avant d’envoyer', async () => {
    fillForm();
    submitForm(fixture);
    await settle();
    http.expectNone('/users');
    expect(text(fixture)).toContain('Confirmez que la personne a accepté');
  });

  it('crée un compte Manager puis ouvre sa fiche', async () => {
    fillForm();
    consent().click();
    submitForm(fixture);
    await settle();
    const request = http.expectOne('/users');
    expect(request.request.body).toEqual({
      firstName: 'Sam',
      lastName: 'Petit',
      email: 'sam@exemple.fr',
      password: 'motdepasse',
      roleId: 'role-manager',
      privacyPolicyConsent: true,
      dataProcessingConsent: true,
    });
    request.flush(envelope(account({ id: 'u9' })));
    await settle();
    expect(navigate).toHaveBeenCalledWith(['/gestion/utilisateurs', 'u9']);
  });

  it('affiche le refus de l’API', async () => {
    fillForm();
    consent().click();
    submitForm(fixture);
    await settle();
    http
      .expectOne('/users')
      .flush(
        { message: "L'email est déjà utilisé", status: 400 },
        { status: 400, statusText: 'Bad Request' },
      );
    await settle();
    expect(text(fixture)).toContain("L'email est déjà utilisé");
    expect(navigate).not.toHaveBeenCalled();
  });
});
