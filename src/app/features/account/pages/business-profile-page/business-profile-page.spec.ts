import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BusinessProfileDetails } from '../../../../core/api/generated';
import { envelope, submitForm, text } from '../../../../shared/testing';
import { BusinessProfilePage, toUpsert } from './business-profile-page';

const PROFILE: BusinessProfileDetails = {
  siren: '404833048',
  siret: '40483304800006',
  legalName: 'Burgers & Co',
  vatNumber: 'FR83404833048',
  addressLine1: '1 rue de la Paix',
  postalCode: '75002',
  city: 'Paris',
  countryCode: 'FR',
  createdAt: '2026-11-20T10:00:00Z',
};

async function settle(): Promise<void> {
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
}

describe('BusinessProfilePage', () => {
  let fixture: ComponentFixture<BusinessProfilePage>;
  let http: HttpTestingController;

  const input = (label: string) => {
    const root = fixture.nativeElement as HTMLElement;
    const target = [...root.querySelectorAll('label')].find((l) =>
      l.textContent?.trim().startsWith(label),
    );
    return root.querySelector<HTMLInputElement>(`#${target?.htmlFor}`)!;
  };
  const type = (label: string, value: string) => {
    const field = input(label);
    field.value = value;
    field.dispatchEvent(new Event('input'));
  };

  async function open(profile: BusinessProfileDetails | null): Promise<void> {
    TestBed.configureTestingModule({
      imports: [BusinessProfilePage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(BusinessProfilePage);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    http.expectOne('/users/me/business-profile').flush(envelope(profile));
    for (const request of http.match('/restaurant/info')) {
      request.flush(envelope({}));
    }
    await fixture.whenStable();
  }

  afterEach(() => http.verify());

  it('un particulier devient client professionnel', async () => {
    await open(null);
    expect(text(fixture)).toContain('Devenir client professionnel');
    expect(text(fixture)).not.toContain('Redevenir particulier');

    type('SIREN', '404 833 048');
    type('Raison sociale', 'Burgers & Co');
    type('Adresse de facturation', '1 rue de la Paix');
    type('Code postal', '75002');
    type('Ville', 'Paris');
    await fixture.whenStable();

    submitForm(fixture);
    await fixture.whenStable();
    const request = http.expectOne(
      (r) => r.method === 'PUT' && r.url === '/users/me/business-profile',
    );
    expect(request.request.body).toMatchObject({
      siren: '404833048',
      siret: null,
      vatNumber: null,
      legalName: 'Burgers & Co',
      postalCode: '75002',
    });
    request.flush(envelope(PROFILE));
    await settle();

    expect(text(fixture)).toContain('Profil professionnel enregistré');
    expect(text(fixture)).toContain('Redevenir particulier');
  });

  it("refuse un SIREN qui n'a pas 9 chiffres sans appeler l'API", async () => {
    await open(null);
    type('SIREN', '12345');
    submitForm(fixture);
    await fixture.whenStable();
    expect(text(fixture)).toContain('Le SIREN compte 9 chiffres.');
    http.expectNone((r) => r.method === 'PUT');
  });

  it('un client professionnel retrouve ses informations et peut redevenir particulier', async () => {
    await open(PROFILE);
    expect(input('Raison sociale').value).toBe('Burgers & Co');

    const button = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (b) => b.textContent?.includes('Redevenir particulier'),
    )!;
    button.click();
    await fixture.whenStable();
    http
      .expectOne((r) => r.method === 'DELETE' && r.url === '/users/me/business-profile')
      .flush(envelope(null));
    await settle();

    expect(text(fixture)).toContain('Vous êtes de nouveau client particulier.');
    expect(text(fixture)).toContain('Devenir client professionnel');
  });

  it('normalise les numéros avant envoi', () => {
    expect(
      toUpsert({
        siren: ' 404 833 048 ',
        siret: '',
        legalName: ' X ',
        vatNumber: 'fr 83 404833048',
        addressLine1: 'a',
        addressLine2: ' ',
        postalCode: '75002',
        city: 'Paris',
      }),
    ).toEqual({
      siren: '404833048',
      siret: null,
      legalName: 'X',
      vatNumber: 'FR83404833048',
      addressLine1: 'a',
      addressLine2: null,
      postalCode: '75002',
      city: 'Paris',
    });
  });
});
