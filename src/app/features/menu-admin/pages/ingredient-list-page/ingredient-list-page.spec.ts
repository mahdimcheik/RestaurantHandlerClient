import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IngredientDetails } from '../../../../core/api/generated';
import { clickButton, envelope, fill, text } from '../../testing';
import { IngredientListPage } from './ingredient-list-page';

const ingredient = (id: string, name: string, isAvailable = true): IngredientDetails => ({
  id,
  name,
  priceCents: 0,
  isOfferedAsReplacement: true,
  isAvailable,
  isArchived: false,
});

const list = [
  { ...ingredient('i1', 'Tomate'), imageUrl: 'https://cdn.test/catalog/tomate.webp' },
  ingredient('i2', 'Œuf'),
  ingredient('i3', 'Cheddar', false),
];

describe('IngredientListPage', () => {
  let fixture: ComponentFixture<IngredientListPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [IngredientListPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(IngredientListPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/manage/ingredients').flush(envelope(list));
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const names = () =>
    [...fixture.nativeElement.querySelectorAll('.data-table__main')].map((cell: Element) =>
      cell.textContent?.trim(),
    );

  /** Laisse l'action démarrer, puis répond aux rechargements de cache qui suivent. */
  async function settle(): Promise<void> {
    await Promise.resolve();
    TestBed.tick();
    http
      .match((request) => request.method === 'GET')
      .forEach((request) => request.flush(envelope(list)));
    await fixture.whenStable();
  }

  it('liste par ordre alphabétique et signale les ruptures en toutes lettres', () => {
    expect(names()).toEqual(['Cheddar', 'Œuf', 'Tomate']);
    expect(text(fixture)).toContain('Rupture');
  });

  it('cherche sans tenir compte des accents ni de la ligature', async () => {
    fill(fixture, 'Rechercher', 'oeuf');
    await fixture.whenStable();

    expect(names()).toEqual(['Œuf']);
  });

  it('marque un ingrédient en rupture', async () => {
    clickButton(fixture, 'Marquer en rupture');
    await Promise.resolve();

    const request = http.expectOne('/manage/ingredients/i2/availability');
    expect(request.request.body).toEqual({ isAvailable: false });
    request.flush(envelope({ ...list[1], isAvailable: false }));
    await settle();

    expect(text(fixture)).toContain('« Œuf » est en rupture.');
  });

  it('modifie le nom, le prix de référence et la proposition en remplacement', async () => {
    clickButton(fixture, 'Modifier');
    await fixture.whenStable();
    fill(fixture, 'Nom', 'Cheddar affiné');
    // Le premier champ de ce nom est celui de l'ajout, en haut de page.
    fill(fixture, 'Prix de référence (€)', '0,80', 1);
    const offered = fixture.nativeElement.querySelector(
      'form input[type=checkbox]',
    ) as HTMLInputElement;
    offered.click();
    clickButton(fixture, 'Enregistrer');
    await Promise.resolve();

    const request = http.expectOne('/manage/ingredients/i3');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      name: 'Cheddar affiné',
      priceCents: 80,
      isOfferedAsReplacement: false,
    });
    request.flush(envelope({ ...list[2], name: 'Cheddar affiné' }));
    await settle();

    expect(text(fixture)).toContain('« Cheddar affiné » enregistré.');
  });

  it('affiche la vignette et retire la photo depuis la ligne d’édition', async () => {
    expect(fixture.nativeElement.querySelectorAll('.data-table__thumb').length).toBe(1);

    // Tomate est la troisième ligne : le troisième bouton « Modifier ».
    const edit = [...fixture.nativeElement.querySelectorAll('button')].filter(
      (b: HTMLButtonElement) => b.textContent?.trim() === 'Modifier',
    )[2] as HTMLButtonElement;
    edit.click();
    await fixture.whenStable();

    expect(text(fixture)).toContain("Photo de l'ingrédient");
    clickButton(fixture, 'Retirer la photo');
    await Promise.resolve();

    const request = http.expectOne('/manage/ingredients/i1/image');
    expect(request.request.method).toBe('DELETE');
    request.flush(envelope({ ...list[0], imageUrl: null }));
    await settle();

    expect(text(fixture)).toContain('Photo retirée.');
  });
});
