import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { provideApiConfiguration } from '../api/generated';
import { authInterceptor } from './auth.interceptor';
import { SessionService } from './session.service';
import { envelope, loginData } from './testing';

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let session: SessionService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration('/api'),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    session = TestBed.inject(SessionService);

    const login = firstValueFrom(session.login({ email: 'a@b.fr', password: 'secret123' }));
    http.expectOne('/api/auth/login').flush(envelope(loginData('jwt-1')));
    await login;
  });

  afterEach(() => http.verify());

  it('ajoute le jeton aux appels de l’API seulement', () => {
    client.get('/api/orders/mine').subscribe();
    client.get('/images/auth.webp').subscribe();
    expect(http.expectOne('/api/orders/mine').request.headers.get('Authorization')).toBe(
      'Bearer jwt-1',
    );
    expect(http.expectOne('/images/auth.webp').request.headers.has('Authorization')).toBe(false);
  });

  it('renouvelle le jeton sur un 401 puis rejoue la requête', async () => {
    const result = firstValueFrom(client.get<string>('/api/orders/mine'));
    http.expectOne('/api/orders/mine').flush(null, { status: 401, statusText: '' });
    http.expectOne('/api/auth/refresh-token').flush(envelope(loginData('jwt-2')));
    const replay = http.expectOne('/api/orders/mine');
    expect(replay.request.headers.get('Authorization')).toBe('Bearer jwt-2');
    replay.flush('ok');
    expect(await result).toBe('ok');
  });

  it('renvoie vers la connexion si le renouvellement échoue', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const result = firstValueFrom(client.get('/api/orders/mine'));
    http.expectOne('/api/orders/mine').flush(null, { status: 401, statusText: '' });
    http.expectOne('/api/auth/refresh-token').flush(null, { status: 401, statusText: '' });

    await expect(result).rejects.toMatchObject({ status: 401 });
    expect(session.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/auth/connexion'], expect.anything());
  });
});
