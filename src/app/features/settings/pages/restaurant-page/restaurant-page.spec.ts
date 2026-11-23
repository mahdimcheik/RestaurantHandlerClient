import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RestaurantSettingsDetails } from '../../../../core/api/generated';
import { envelope, fill, submitForm, text } from '../../../../shared/testing';
import { RestaurantPage } from './restaurant-page';

const settings: RestaurantSettingsDetails = {
  tradeName: 'Le Four',
  legalName: null,
  address: '1 rue du Port',
  isPaused: false,
  asapDelayMinutes: 15,
  slotDurationMinutes: 15,
  slotCapacityOrders: 5,
  minLeadMinutes: 20,
  approvalTimeoutMinutes: 10,
  pickupGraceMinutes: 30,
  noShowThreshold: 2,
  onlinePaymentExpiryMinutes: 30,
};

describe('RestaurantPage', () => {
  let fixture: ComponentFixture<RestaurantPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [RestaurantPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(RestaurantPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/manage/restaurant/settings').flush(envelope(settings));
    http.expectOne((r) => r.url === '/manage/restaurant/settings/history').flush(
      envelope([
        {
          id: 'h1',
          changedAt: '2026-11-20T09:00:00Z',
          changedByUserId: 'u1',
          changedByName: 'Nino',
          snapshot: '{}',
        },
      ]),
    );
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('montre l’historique des modifications', () => {
    expect(text(fixture)).toContain('Nino');
  });

  it('renvoie tous les réglages, SIRET et TVA nettoyés', async () => {
    fill(fixture, 'SIRET (facultatif)', '732 829 320 00074');
    fill(fixture, 'N° de TVA intracommunautaire (facultatif)', 'fr 44 732829320');
    fill(fixture, 'Commandes par créneau', '8');
    submitForm(fixture);
    await fixture.whenStable();

    const put = http.expectOne((r) => r.method === 'PUT');
    expect(put.request.body).toEqual({
      tradeName: 'Le Four',
      legalName: null,
      address: '1 rue du Port',
      phone: null,
      siret: '73282932000074',
      vatNumber: 'FR44732829320',
      asapDelayMinutes: 15,
      slotDurationMinutes: 15,
      slotCapacityOrders: 8,
      minLeadMinutes: 20,
      approvalTimeoutMinutes: 10,
      pickupGraceMinutes: 30,
      noShowThreshold: 2,
      onlinePaymentExpiryMinutes: 30,
    });
    put.flush(envelope({ ...settings, slotCapacityOrders: 8 }));
    await Promise.resolve();
    TestBed.tick();
    http
      .match((r) => r.method === 'GET')
      .forEach((r) => r.flush(envelope(r.request.url.endsWith('/history') ? [] : settings)));
    await fixture.whenStable();
    expect(text(fixture)).toContain('Modifications enregistrées.');
  });

  it('refuse une capacité hors bornes sans appeler l’API', async () => {
    fill(fixture, 'Commandes par créneau', '0');
    submitForm(fixture);
    await fixture.whenStable();
    expect(text(fixture)).toContain('1 au minimum.');
    http.expectNone((r) => r.method === 'PUT');
  });
});
