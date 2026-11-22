import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { envelope, loginData } from './testing';
import { SessionService } from './session.service';

describe('SessionService', () => {
  let session: SessionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    session = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('ouvre la session à la connexion', async () => {
    const done = firstValueFrom(session.login({ email: 'a@b.fr', password: 'secret123' }));
    const request = http.expectOne('/auth/login');
    expect(request.request.body).toEqual({ email: 'a@b.fr', password: 'secret123' });
    request.flush(envelope(loginData()));

    expect((await done).firstName).toBe('Ana');
    expect(session.isAuthenticated()).toBe(true);
    expect(session.accessToken()).toBe('jwt-1');
  });

  it('signale un compte non activé', async () => {
    const done = firstValueFrom(session.login({ email: 'a@b.fr', password: 'secret123' }));
    http.expectOne('/auth/login').flush(envelope(loginData('jwt', false)));
    await done;
    expect(session.needsActivation()).toBe(true);
  });

  it('reste anonyme si le cookie de renouvellement manque', async () => {
    const done = session.restore();
    http
      .expectOne('/auth/refresh-token')
      .flush(
        { message: 'Refresh token non-existant', status: 401 },
        { status: 401, statusText: '' },
      );
    await done;
    expect(session.isAuthenticated()).toBe(false);
  });

  it('partage un renouvellement entre appels simultanés', async () => {
    const first = firstValueFrom(session.refresh());
    const second = firstValueFrom(session.refresh());
    http.expectOne('/auth/refresh-token').flush(envelope(loginData('jwt-2')));
    expect(await first).toBe('jwt-2');
    expect(await second).toBe('jwt-2');
  });

  it('se déconnecte même si l’API échoue', async () => {
    const login = firstValueFrom(session.login({ email: 'a@b.fr', password: 'secret123' }));
    http.expectOne('/auth/login').flush(envelope(loginData()));
    await login;

    const done = firstValueFrom(session.logout(), { defaultValue: undefined });
    http.expectOne('/auth/logout').flush(null, { status: 500, statusText: '' });
    await done;
    expect(session.isAuthenticated()).toBe(false);
  });
});
