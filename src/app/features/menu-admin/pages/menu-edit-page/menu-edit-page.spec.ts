import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CategoryDetails, MenuDetails, ProductDetails } from '../../../../core/api/generated';
import { clickButton, envelope, fill, submitForm, text } from '../../../../shared/testing';
import { MenuEditPage } from './menu-edit-page';

const category: CategoryDetails = {
  id: 'cat1',
  name: 'Plats',
  position: 0,
  isActive: true,
  isArchived: false,
  activeProductCount: 2,
};

const product = (id: string, name: string, isActive = true): ProductDetails => ({
  id,
  categoryId: 'cat1',
  name,
  kind: 'Dish',
  priceCents: 900,
  vatRate: 10,
  position: 0,
  isActive,
  isArchived: false,
  isAvailable: true,
  composition: { ingredients: [] },
  optionGroups: [],
});

const products = [product('p1', 'Burger'), product('p2', 'Salade'), product('p3', 'Ancien', false)];

const formula: MenuDetails = {
  id: 'm1',
  name: 'Formule midi',
  priceCents: 1350,
  vatRate: 10,
  position: 0,
  isActive: true,
  isArchived: false,
  slots: [
    {
      id: 's1',
      label: 'Plat',
      position: 0,
      minChoices: 1,
      maxChoices: 1,
      options: [{ productId: 'p1', productName: 'Burger', extraPriceCents: 0 }],
    },
  ],
};

function setup(id?: string) {
  TestBed.configureTestingModule({
    imports: [MenuEditPage],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const fixture = TestBed.createComponent(MenuEditPage);
  const http = TestBed.inject(HttpTestingController);
  if (id) {
    fixture.componentRef.setInput('id', id);
  }
  fixture.detectChanges();
  http.expectOne('/manage/products').flush(envelope(products));
  http.expectOne('/manage/categories').flush(envelope([category]));
  return { fixture, http };
}

describe('MenuEditPage — création', () => {
  let fixture: ComponentFixture<MenuEditPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    ({ fixture, http } = setup());
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('envoie le prix en centimes et le taux de TVA choisi', async () => {
    fill(fixture, 'Nom', ' Formule midi ');
    fill(fixture, 'Prix TTC du menu (€)', '13,50');
    fill(fixture, 'Taux de TVA', '20');
    submitForm(fixture);
    await Promise.resolve();

    const request = http.expectOne('/manage/menus');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Formule midi',
      description: null,
      priceCents: 1350,
      vatRate: 20,
      isActive: true,
    });
    request.flush(envelope(formula));
    await Promise.resolve();
    TestBed.tick();
    http.match('/manage/menus').forEach((reload) => reload.flush(envelope([formula])));
    await fixture.whenStable();
  });

  it('propose les emplacements seulement après la création', () => {
    expect(text(fixture)).toContain('Les emplacements se composent une fois le menu créé.');
  });
});

describe('MenuEditPage — emplacements', () => {
  let fixture: ComponentFixture<MenuEditPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    ({ fixture, http } = setup('m1'));
    http.expectOne('/manage/menus/m1').flush(envelope(formula));
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  /** Laisse l'action partir, puis répond au rechargement du cache des menus. */
  async function respond(url: string, menu: MenuDetails) {
    await Promise.resolve();
    const request = http.expectOne(url);
    request.flush(envelope(menu));
    await Promise.resolve();
    TestBed.tick();
    http.match('/manage/menus').forEach((reload) => reload.flush(envelope([menu])));
    await fixture.whenStable();
    return request;
  }

  it('ajoute un emplacement avec ses bornes', async () => {
    fill(fixture, 'Libellé', 'Boisson', 1);
    fill(fixture, 'Minimum de choix', '0', 1);
    clickButton(fixture, "Ajouter l'emplacement");
    const added: MenuDetails = {
      ...formula,
      slots: [
        ...formula.slots,
        { id: 's2', label: 'Boisson', position: 1, minChoices: 0, maxChoices: 1, options: [] },
      ],
    };
    const request = await respond('/manage/menus/m1/slots', added);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ label: 'Boisson', minChoices: 0, maxChoices: 1 });
    expect(text(fixture)).toContain('Emplacement « Boisson » ajouté.');
    expect(text(fixture)).toContain('Aucun produit dans cet emplacement.');
  });

  it('refuse un maximum inférieur au minimum sans appeler l’API', async () => {
    fill(fixture, 'Minimum de choix', '3');
    fill(fixture, 'Maximum de choix', '2');
    clickButton(fixture, "Enregistrer l'emplacement");
    await fixture.whenStable();

    http.expectNone('/manage/menus/m1/slots/s1');
    expect(text(fixture)).toContain('Le maximum doit être au moins égal au minimum.');
  });

  it('enregistre les produits proposés avec leur surcoût en centimes', async () => {
    fill(fixture, 'Ajouter un produit', 'p2');
    await fixture.whenStable();
    clickButton(fixture, 'Ajouter');
    await fixture.whenStable();
    fill(fixture, 'Surcoût (€)', '1,50', 1);
    clickButton(fixture, 'Enregistrer les produits');
    const request = await respond('/manage/menus/m1/slots/s1/options', formula);

    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      options: [
        { productId: 'p1', extraPriceCents: 0 },
        { productId: 'p2', extraPriceCents: 150 },
      ],
    });
  });

  it('ne propose que les produits actifs absents de l’emplacement', () => {
    const offered = [...fixture.nativeElement.querySelectorAll('optgroup option')].map(
      (option: Element) => option.getAttribute('value'),
    );
    expect(offered).toEqual(['p2']);
  });
});
