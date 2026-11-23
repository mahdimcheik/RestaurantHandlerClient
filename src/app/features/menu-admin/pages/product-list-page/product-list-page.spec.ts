import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CategoryDetails, ProductDetails } from '../../../../core/api/generated';
import { clickButton, envelope, text } from '../../../../shared/testing';
import { ProductListPage } from './product-list-page';

const category = (id: string, name: string): CategoryDetails => ({
  id,
  name,
  position: 0,
  isActive: true,
  isArchived: false,
  activeProductCount: 1,
});

const product = (id: string, name: string, categoryId: string): ProductDetails => ({
  id,
  categoryId,
  name,
  kind: 'Dish',
  priceCents: 900,
  vatRate: 10,
  position: 0,
  isActive: true,
  isArchived: false,
  isAvailable: true,
  composition: { ingredients: [] },
  optionGroups: [],
});

const products = [
  product('p1', 'Burger', 'cat1'),
  product('p2', 'Wrap', 'cat1'),
  product('p3', 'Cola', 'cat2'),
];

describe('ProductListPage', () => {
  let fixture: ComponentFixture<ProductListPage>;
  let http: HttpTestingController;

  async function setup(categorie?: string): Promise<void> {
    TestBed.configureTestingModule({
      imports: [ProductListPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(ProductListPage);
    http = TestBed.inject(HttpTestingController);
    if (categorie) {
      fixture.componentRef.setInput('categorie', categorie);
    }
    fixture.detectChanges();
    http.expectOne('/manage/products').flush(envelope(products));
    http
      .expectOne('/manage/categories')
      .flush(envelope([category('cat1', 'Plats'), category('cat2', 'Boissons')]));
    await fixture.whenStable();
  }

  /** Répond aux rechargements de caches qui suivent une écriture. */
  async function flushReloads(): Promise<void> {
    await Promise.resolve();
    TestBed.tick();
    http.match((request) => request.method === 'GET').forEach((r) => r.flush(envelope([])));
    await fixture.whenStable();
  }

  afterEach(() => http.verify());

  it('demande une catégorie avant de proposer de changer l’ordre', async () => {
    await setup();
    expect(text(fixture)).toContain("Choisissez une catégorie pour changer l'ordre des produits.");
    expect(fixture.nativeElement.querySelector('app-move-buttons')).toBeNull();
  });

  it('réordonne les produits de la catégorie filtrée', async () => {
    await setup('cat1');
    clickButton(fixture, 'Monter « Wrap »');
    await Promise.resolve();

    const request = http.expectOne('/manage/products/reorder?categoryId=cat1');
    expect(request.request.body).toEqual({ orderedIds: ['p2', 'p1'] });
    request.flush(envelope([products[1], products[0]]));
    await flushReloads();
  });

  it('déclare un produit en rupture', async () => {
    await setup();
    clickButton(fixture, 'Marquer en rupture');
    await Promise.resolve();

    const request = http.expectOne('/manage/products/p1/availability');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ isAvailable: false });
    request.flush(envelope({ ...products[0], isAvailable: false }));
    await flushReloads();

    expect(text(fixture)).toContain('« Burger » est en rupture.');
  });
});
