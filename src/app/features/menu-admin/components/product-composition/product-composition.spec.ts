import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CompositionDetails, IngredientDetails } from '../../../../core/api/generated';
import { clickButton, envelope, fill, submitForm, text } from '../../../../shared/testing';
import { ProductComposition } from './product-composition';

const ingredient = (id: string, name: string, priceCents = 0): IngredientDetails => ({
  id,
  name,
  priceCents,
  isOfferedAsReplacement: true,
  isAvailable: true,
  isArchived: false,
});

const ingredients = [
  ingredient('i-pate', 'Pâte'),
  ingredient('i-tomate', 'Tomate', 30),
  ingredient('i-mozza', 'Mozzarella', 150),
];

const margherita: CompositionDetails = {
  ingredients: [
    { ingredientId: 'i-pate', name: 'Pâte', isRemovable: false, isAvailable: true },
    { ingredientId: 'i-tomate', name: 'Tomate', isRemovable: true, isAvailable: true },
  ],
};

describe('ProductComposition', () => {
  let fixture: ComponentFixture<ProductComposition>;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ProductComposition],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(ProductComposition);
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('productId', 'p1');
    fixture.componentRef.setInput('composition', margherita);
    fixture.detectChanges();
    http.expectOne('/manage/ingredients').flush(envelope(ingredients));
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  /** Laisse l'action démarrer, puis répond aux rechargements de cache qui suivent. */
  async function settle(extra: IngredientDetails[] = []): Promise<void> {
    await Promise.resolve();
    TestBed.tick();
    http
      .match('/manage/ingredients')
      .forEach((request) => request.flush(envelope([...ingredients, ...extra])));
    await fixture.whenStable();
  }

  const names = () =>
    [...fixture.nativeElement.querySelectorAll('.stack-list__title')].map((element: Element) =>
      element.textContent?.trim(),
    );

  it('propose seulement les ingrédients absents de la composition', () => {
    const options = [...fixture.nativeElement.querySelectorAll('#composition-add option')].map(
      (option: HTMLOptionElement) => option.textContent?.trim(),
    );
    expect(options).toEqual(['Choisir…', 'Mozzarella']);
  });

  it('ajoute un ingrédient, retirable par défaut, et envoie la composition', async () => {
    fill(fixture, 'Ajouter un ingrédient', 'i-mozza');
    await fixture.whenStable();
    clickButton(fixture, 'Ajouter');
    await fixture.whenStable();
    expect(names()).toEqual(['Pâte', 'Tomate', 'Mozzarella']);

    clickButton(fixture, 'Enregistrer la composition');
    await Promise.resolve();

    const request = http.expectOne('/manage/products/p1/composition');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      ingredients: [
        { ingredientId: 'i-pate', isRemovable: false },
        { ingredientId: 'i-tomate', isRemovable: true },
        { ingredientId: 'i-mozza', isRemovable: true },
      ],
    });
    request.flush(envelope({ id: 'p1', composition: margherita }));
    await settle();

    expect(text(fixture)).toContain('Composition enregistrée.');
  });

  it('retire un ingrédient de la composition', async () => {
    clickButton(fixture, 'Retirer « Tomate » de la composition');
    await fixture.whenStable();

    expect(names()).toEqual(['Pâte']);
  });

  it('crée un ingrédient avec son prix et l’ajoute à la composition', async () => {
    fill(fixture, 'Ingrédient absent de la liste ? Créez-le', 'Saumon');
    fill(fixture, 'Prix de référence (€)', '3,30');
    submitForm(fixture);
    await Promise.resolve();

    const request = http.expectOne('/manage/ingredients');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Saumon', priceCents: 330 });
    const saumon = ingredient('i-saumon', 'Saumon', 330);
    request.flush(envelope(saumon));
    await settle([saumon]);

    expect(text(fixture)).toContain('« Saumon » créé et ajouté à la composition.');
    expect(names()).toEqual(['Pâte', 'Tomate', 'Saumon']);
  });
});
