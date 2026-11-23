import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CategoryDetails } from '../../core/api/generated';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { FakeConnection, provideFakeHub } from '../../core/realtime/testing';
import { CategoriesService } from './categories.service';
import { StoreService } from './store.service';

const category = (id: string): CategoryDetails => ({
  id,
  name: `Catégorie ${id}`,
  activeProductCount: 0,
  isActive: true,
  isArchived: false,
  position: 0,
});

/** Laisse la ressource traiter la réponse reçue. */
const settle = () => TestBed.inject(ApplicationRef).whenStable();

const envelope = <T>(data: T) => ({ data, message: 'OK', status: 200 });

describe('StoreService', () => {
  let store: StoreService;
  let http: HttpTestingController;
  let connections: FakeConnection[];

  beforeEach(() => {
    connections = [];
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideFakeHub(connections)],
    });
    store = TestBed.inject(StoreService);
    http = TestBed.inject(HttpTestingController);
  });

  /** Laisse passer les promesses en cours puis la détection (sans attendre les requêtes). */
  const tick = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
  };

  afterEach(() => http.verify());

  it('ne charge rien avant load()', () => {
    TestBed.tick();
    http.expectNone('/manage/categories');
    expect(store.categories.value()).toEqual([]);
  });

  it('charge une seule fois et partage la valeur', async () => {
    store.categories.load();
    TestBed.tick();
    http.expectOne('/manage/categories').flush(envelope([category('a')]));
    await settle();

    store.categories.load();
    TestBed.tick();
    http.expectNone('/manage/categories');
    expect(store.categories.value().map((c) => c.id)).toEqual(['a']);
  });

  it('garde la valeur de repli en cas d’erreur', async () => {
    store.categories.load();
    TestBed.tick();
    http.expectOne('/manage/categories').flush(null, { status: 500, statusText: 'Erreur' });
    await settle();

    expect(store.categories.value()).toEqual([]);
    expect(store.categories.error()).toBeDefined();
  });

  it('recharge le cache après une écriture du wrapper', async () => {
    const categories = TestBed.inject(CategoriesService);
    store.categories.load();
    TestBed.tick();
    http.expectOne('/manage/categories').flush(envelope([category('a')]));
    await settle();

    let created: CategoryDetails | undefined;
    categories.create({ name: 'Desserts' }).subscribe((c) => (created = c));
    http.expectOne({ method: 'POST', url: '/manage/categories' }).flush(envelope(category('b')));
    expect(created?.id).toBe('b');

    TestBed.tick();
    http.expectOne('/manage/categories').flush(envelope([category('a'), category('b')]));
    await settle();
    expect(store.categories.value().map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('ne recharge pas un cache jamais demandé', () => {
    const categories = TestBed.inject(CategoriesService);
    categories.remove('a').subscribe();
    http.expectOne({ method: 'DELETE', url: '/manage/categories/a' }).flush(envelope({}));
    TestBed.tick();
    http.expectNone('/manage/categories');
    http.expectNone('/manage/products');
  });

  it('relit la carte déjà chargée quand le serveur annonce un changement', async () => {
    store.categories.load();
    TestBed.tick();
    http.expectOne('/manage/categories').flush(envelope([category('a')]));
    await settle();

    const realtime = TestBed.inject(RealtimeService);
    realtime.start();
    await tick();
    // La connexion établie demande déjà une relecture.
    http.expectOne('/manage/categories').flush(envelope([category('a')]));
    await settle();

    connections[0].emit('AvailabilityChanged', { scope: 'opening' });
    await tick();
    http.expectNone('/manage/categories');

    connections[0].emit('AvailabilityChanged', { scope: 'catalog' });
    await tick();
    http.expectOne('/manage/categories').flush(envelope([category('a'), category('b')]));
    await settle();
    expect(store.categories.value().map((c) => c.id)).toEqual(['a', 'b']);
    // Jamais demandés : pas relus.
    http.expectNone('/manage/products');
    realtime.stop();
  });
});
