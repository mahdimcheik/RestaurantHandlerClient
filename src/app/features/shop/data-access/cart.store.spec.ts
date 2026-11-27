import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PublicCard } from '../../../core/api/generated';
import { fakeRealtime } from '../../../core/realtime/testing';
import { PublicStore } from '../../../shared/services/public-store.service';
import { envelope } from '../../../shared/testing';
import { CART_STORAGE_KEY, CartStore } from './cart.store';

const card = (productIds: string[]): PublicCard => ({
  categories: [
    {
      id: 'c1',
      name: 'Burgers',
      products: productIds.map((id) => ({
        id,
        name: id,
        kind: 'Dish',
        priceCents: 900,
        isAvailable: true,
        ingredients: [],
        optionGroups: [],
      })),
    },
  ],
  menus: [],
  replacements: [],
  opening: { status: 'Open', asapDelayMinutes: 15 },
});

describe('CartStore', () => {
  const setup = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), fakeRealtime().provider],
    });
    return TestBed.inject(CartStore);
  };

  beforeEach(() => localStorage.clear());

  it('conserve le panier et sa clé sur l’appareil, et les retrouve au rechargement', () => {
    const cart = setup();
    cart.addProduct({ id: 'p1', name: 'Burger' });
    const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '{}');
    expect(stored.lines[0].productId).toBe('p1');
    expect(stored.key).toBe(cart.idempotencyKey());

    TestBed.resetTestingModule();
    const reloaded = setup();
    expect(reloaded.lines().map((line) => line.name)).toEqual(['Burger']);
    expect(reloaded.idempotencyKey()).toBe(stored.key);
  });

  it('change de clé à chaque modification et oublie le panier une fois vidé', () => {
    const cart = setup();
    cart.addProduct({ id: 'p1', name: 'Burger' });
    const key = cart.idempotencyKey();
    cart.issues.set([{ lineIndex: 0, message: 'Rupture' }]);
    cart.addProduct({ id: 'p1', name: 'Burger' });
    expect(cart.idempotencyKey()).not.toBe(key);
    expect(cart.issues()).toEqual([]);

    cart.clear();
    expect(localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  });

  it('ignore un contenu illisible', () => {
    localStorage.setItem(CART_STORAGE_KEY, '{"version":0}');
    expect(setup().isEmpty()).toBe(true);
  });

  it('retire et signale les lignes dont le produit a quitté la carte', async () => {
    const cart = setup();
    cart.addProduct({ id: 'p1', name: 'Burger' });
    cart.addProduct({ id: 'gone', name: 'Wrap' });

    TestBed.inject(PublicStore).card.load();
    TestBed.tick();
    TestBed.inject(HttpTestingController)
      .expectOne('/menu')
      .flush(envelope(card(['p1'])));
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();

    expect(cart.lines().map((line) => line.name)).toEqual(['Burger']);
    expect(cart.removed()).toEqual(['Wrap']);
  });

  it('envoie le retrait imposé d’un ingrédient en rupture et signale un produit indisponible', async () => {
    const cart = setup();
    cart.addProduct({ id: 'p1', name: 'Reine' });
    cart.addProduct({ id: 'p2', name: 'Calzone' });

    const ruptured = card(['p1', 'p2']);
    const [reine, calzone] = ruptured.categories[0].products;
    reine.ingredients = [
      {
        ingredientId: 'tomate',
        name: 'Tomate',
        isRemovable: true,
        isForcedRemoved: true,
        priceCents: 50,
      },
    ];
    calzone.isAvailable = false;
    TestBed.inject(PublicStore).card.load();
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('/menu').flush(envelope(ruptured));
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();

    expect(cart.cartLines()[0].modifications).toEqual([{ type: 'Remove', ingredientId: 'tomate' }]);
    expect(cart.labelsOf(cart.lines()[0])).toEqual(['Sans Tomate (rupture)']);
    const stored = cart.lines()[0];
    expect(stored.kind === 'product' ? stored.customization.modifications : null).toEqual([]);
    expect(cart.unavailable()).toEqual([{ lineIndex: 1, message: "p2 n'est plus disponible." }]);
  });
});
