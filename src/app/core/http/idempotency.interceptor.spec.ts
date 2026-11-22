import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { idempotencyInterceptor } from './idempotency.interceptor';

describe('idempotencyInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([idempotencyInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('ajoute une clé différente à chaque écriture vers l’API', () => {
    http.post('/api/manage/categories', {}).subscribe();
    http.delete('/api/manage/categories/1').subscribe();
    const [post, del] = backend.match(() => true);

    const first = post.request.headers.get('Idempotency-Key');
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(del.request.headers.get('Idempotency-Key')).not.toBe(first);
  });

  it('ne touche ni aux lectures, ni aux autres origines, ni à une clé fournie', () => {
    http.get('/api/manage/categories').subscribe();
    http.post('https://exemple.fr/x', {}).subscribe();
    http.put('/api/manage/products/1', {}, { headers: { 'Idempotency-Key': 'k' } }).subscribe();
    const [get, external, put] = backend.match(() => true);

    expect(get.request.headers.has('Idempotency-Key')).toBe(false);
    expect(external.request.headers.has('Idempotency-Key')).toBe(false);
    expect(put.request.headers.get('Idempotency-Key')).toBe('k');
  });
});
