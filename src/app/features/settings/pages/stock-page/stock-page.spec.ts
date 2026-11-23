import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IngredientDetails, ProductDetails } from '../../../../core/api/generated';
import { clickButton, envelope, text } from '../../../../shared/testing';
import { StockPage } from './stock-page';

const product = (
  id: string,
  name: string,
  extra: Partial<ProductDetails> = {},
): ProductDetails => ({
  id,
  categoryId: 'cat1',
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
  ...extra,
});

const ingredient = (id: string, name: string, isAvailable: boolean): IngredientDetails => ({
  id,
  name,
  isAvailable,
  isArchived: false,
  isOfferedAsReplacement: false,
  priceCents: 0,
});

describe('StockPage', () => {
  let fixture: ComponentFixture<StockPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [StockPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(StockPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http
      .expectOne('/manage/products')
      .flush(
        envelope([
          product('p1', 'Burger'),
          product('p2', 'Wrap', { isAvailable: false }),
          product('p3', 'Ancien', { isActive: false }),
        ]),
      );
    http
      .expectOne('/manage/ingredients')
      .flush(envelope([ingredient('i1', 'Tomate', true), ingredient('i2', 'Crème', false)]));
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('liste les produits actifs et les ingrédients, ruptures comptées', () => {
    expect(text(fixture)).toContain('Burger');
    expect(text(fixture)).not.toContain('Ancien');
    expect(text(fixture)).toContain('Tomate');
    expect(text(fixture)).toContain('2 ruptures');
  });

  it('filtre les ruptures et la recherche, accents ignorés', async () => {
    const onlyOut = fixture.nativeElement.querySelector('input[type=checkbox]') as HTMLInputElement;
    onlyOut.checked = true;
    onlyOut.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(text(fixture)).not.toContain('Burger');
    expect(text(fixture)).toContain('Wrap');

    const search = fixture.nativeElement.querySelector('#stock-search') as HTMLInputElement;
    search.value = 'creme';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(text(fixture)).not.toContain('Wrap');
    expect(text(fixture)).toContain('Crème');
  });

  it('déclare la rupture d’un ingrédient d’une touche', async () => {
    const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    buttons
      .filter((b) => b.textContent?.trim() === 'Marquer en rupture')
      .at(-1)!
      .click();
    const put = http.expectOne('/manage/ingredients/i1/availability');
    expect(put.request.body).toEqual({ isAvailable: false });
    put.flush(envelope(ingredient('i1', 'Tomate', false)));
    await Promise.resolve();
    TestBed.tick();
    http.match((r) => r.method === 'GET').forEach((r) => r.flush(envelope([])));
    await fixture.whenStable();
    expect(text(fixture)).toContain('« Tomate » est en rupture.');
  });

  it('remet un produit en vente', async () => {
    clickButton(fixture, 'Remettre en vente');
    const put = http.expectOne('/manage/products/p2/availability');
    expect(put.request.body).toEqual({ isAvailable: true });
    put.flush(envelope(product('p2', 'Wrap')));
    await Promise.resolve();
    TestBed.tick();
    http.match((r) => r.method === 'GET').forEach((r) => r.flush(envelope([])));
    await fixture.whenStable();
  });
});
