import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OptionGroupDetails, ProductDetails } from '../../../../core/api/generated';
import {
  clickButton,
  control,
  envelope,
  fill,
  polyfillDialog,
  text,
} from '../../../../shared/testing';
import { ProductEditPage } from './product-edit-page';

const ingredients: OptionGroupDetails = {
  id: 'g1',
  label: 'Ingrédients',
  position: 0,
  minChoices: 3,
  maxChoices: 3,
  maxPerChoice: 2,
  isArchived: false,
  productCount: 1,
  choices: [
    { id: 'c1', name: 'Jambon', extraPriceCents: 0, position: 0, isAvailable: true },
    { id: 'c2', name: 'Œuf', extraPriceCents: 0, position: 1, isAvailable: true },
    { id: 'c3', name: 'Olives', extraPriceCents: 0, position: 2, isAvailable: true },
  ],
};

const pizza: ProductDetails = {
  id: 'p1',
  categoryId: 'cat1',
  name: 'Pizza 5 ingrédients',
  kind: 'Dish',
  priceCents: 1100,
  vatRate: 10,
  position: 0,
  isActive: true,
  isArchived: false,
  isAvailable: true,
  composition: { ingredients: [] },
  optionGroups: [ingredients],
};

describe('ProductEditPage — groupes d’options', () => {
  let fixture: ComponentFixture<ProductEditPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    polyfillDialog();
    TestBed.configureTestingModule({
      imports: [ProductEditPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(ProductEditPage);
    http = TestBed.inject(HttpTestingController);

    fixture.componentRef.setInput('id', 'p1');
    fixture.detectChanges();
    http.expectOne('/manage/categories').flush(envelope([]));
    http.expectOne('/manage/option-groups').flush(envelope([ingredients]));
    http.expectOne('/manage/products/p1').flush(envelope(pizza));
    // Section composition, affichée une fois le produit chargé.
    await Promise.resolve();
    TestBed.tick();
    http.expectOne('/manage/ingredients').flush(envelope([]));
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  /** Les enregistrements rechargent les caches touchés (lectures GET). */
  async function flushReads(): Promise<void> {
    await Promise.resolve();
    TestBed.tick();
    http
      .match((request) => request.method === 'GET')
      .forEach((request) => request.flush(envelope([ingredients])));
    await fixture.whenStable();
  }

  /** « Enregistrer » de l'en-tête : informations du produit d'abord. */
  async function saveInfo(): Promise<void> {
    clickButton(fixture, 'Enregistrer');
    await fixture.whenStable();
    const request = http.expectOne('/manage/products/p1');
    expect(request.request.method).toBe('PUT');
    request.flush(envelope(pizza));
    await flushReads();
  }

  it('place « Enregistrer » dans l’en-tête, à côté d’« Archiver »', () => {
    const toolbar = fixture.nativeElement.querySelector('.page-head .toolbar') as HTMLElement;
    const labels = [
      ...toolbar.querySelectorAll(':scope > button, :scope > app-archive-button > button'),
    ].map((button) => button.textContent?.trim());
    expect(labels).toEqual(['Marquer en rupture', 'Archiver', 'Enregistrer']);
  });

  it('envoie les nombres propres au produit quand la case est cochée', async () => {
    control(fixture, 'Nombre de choix propre à ce produit').click();
    await fixture.whenStable();
    fill(fixture, 'Minimum de choix', '5');
    fill(fixture, 'Maximum de choix', '5');
    await saveInfo();

    const request = http.expectOne('/manage/products/p1/option-groups');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      optionGroups: [{ optionGroupId: 'g1', rules: { minChoices: 5, maxChoices: 5 } }],
    });
    request.flush(
      envelope({
        ...pizza,
        optionGroups: [{ ...ingredients, productRules: { minChoices: 5, maxChoices: 5 } }],
      }),
    );
    await flushReads();

    expect(text(fixture)).toContain('Modifications enregistrées.');
  });

  it('n’envoie pas les groupes inchangés', async () => {
    await saveInfo();

    http.expectNone('/manage/products/p1/option-groups');
    expect(text(fixture)).toContain('Modifications enregistrées.');
  });

  it('ajoute un groupe par le dialogue, avec les nombres du groupe', async () => {
    clickButton(fixture, 'Retirer « Ingrédients »');
    await fixture.whenStable();
    expect(text(fixture)).toContain("Aucun groupe d'options sur ce produit.");

    clickButton(fixture, 'Ajouter un groupe');
    fill(fixture, 'Groupe', 'g1');
    await fixture.whenStable();
    clickButton(fixture, 'Ajouter');
    await fixture.whenStable();
    expect(text(fixture)).toContain('Groupe : 3 à 3 choix');

    // Liste identique à celle enregistrée : rien à envoyer pour les groupes.
    await saveInfo();
    http.expectNone('/manage/products/p1/option-groups');
  });

  it('refuse un maximum inférieur au minimum sans rien envoyer', async () => {
    control(fixture, 'Nombre de choix propre à ce produit').click();
    await fixture.whenStable();
    fill(fixture, 'Minimum de choix', '5');
    fill(fixture, 'Maximum de choix', '4');
    clickButton(fixture, 'Enregistrer');
    await fixture.whenStable();

    http.expectNone('/manage/products/p1');
    http.expectNone('/manage/products/p1/option-groups');
  });
});
