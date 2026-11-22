import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { OptionGroupDetails } from '../../../../core/api/generated';
import { clickButton, envelope, fill, submitForm, text } from '../../testing';
import { OptionGroupEditPage } from './option-group-edit-page';

const sauces: OptionGroupDetails = {
  id: 'g1',
  label: 'Sauces',
  imageUrl: null,
  position: 0,
  minChoices: 0,
  maxChoices: 3,
  freeChoices: 2,
  extraChoicePriceCents: 50,
  isArchived: false,
  productCount: 2,
  choices: [
    { id: 'c1', name: 'Blanche', extraPriceCents: 0, position: 0, isAvailable: true },
    { id: 'c2', name: 'Samouraï', extraPriceCents: 0, position: 1, isAvailable: true },
  ],
};

describe('OptionGroupEditPage', () => {
  let fixture: ComponentFixture<OptionGroupEditPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OptionGroupEditPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(OptionGroupEditPage);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Le cache charge ingrédients et produits pour les listes de la fiche. */
  function flushCaches(): void {
    http.expectOne('/manage/ingredients').flush(envelope([]));
    http.expectOne('/manage/products').flush(envelope([]));
  }

  async function open(): Promise<void> {
    fixture.componentRef.setInput('id', 'g1');
    fixture.detectChanges();
    flushCaches();
    http.expectOne('/manage/option-groups/g1').flush(envelope(sauces));
    await fixture.whenStable();
  }

  it('crée un groupe avec ses choix, prix convertis en centimes', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    flushCaches();
    await fixture.whenStable();

    fill(fixture, 'Libellé', 'Taille');
    fill(fixture, 'Nom', '29 cm', 0);
    fill(fixture, 'Nom', '33 cm', 1);
    fill(fixture, 'Surcoût (€)', '3', 1);
    submitForm(fixture);

    const request = http.expectOne('/manage/option-groups');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      label: 'Taille',
      minChoices: 1,
      maxChoices: 1,
      freeChoices: 1,
      extraChoicePriceCents: 0,
      choices: [
        { id: null, name: '29 cm', extraPriceCents: 0, ingredientId: null },
        { id: null, name: '33 cm', extraPriceCents: 300, ingredientId: null },
      ],
    });
    request.flush(envelope({ ...sauces, id: 'g2', label: 'Taille' }));
    TestBed.tick();
    http.expectOne('/manage/products').flush(envelope([]));
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/gestion/options', 'g2'], { replaceUrl: true });
  });

  it('réordonne et retire des choix en gardant leurs identifiants', async () => {
    await open();
    expect(text(fixture)).toContain('Proposé sur aucun produit');

    clickButton(fixture, 'Descendre le choix 1');
    clickButton(fixture, 'Ajouter un choix');
    await fixture.whenStable();
    fill(fixture, 'Nom', 'Algérienne', 2);
    submitForm(fixture);

    const request = http.expectOne('/manage/option-groups/g1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.choices.map((c: { id: string | null }) => c.id)).toEqual([
      'c2',
      'c1',
      null,
    ]);
    request.flush(envelope(sauces));
    TestBed.tick();
    http.expectOne('/manage/products').flush(envelope([]));
    await fixture.whenStable();
  });

  it('refuse un maximum inférieur au minimum sans appeler l’API', async () => {
    await open();
    fill(fixture, 'Minimum de choix', '3');
    fill(fixture, 'Maximum de choix', '1');
    submitForm(fixture);
    await fixture.whenStable();

    http.expectNone('/manage/option-groups/g1');
    expect(text(fixture)).toContain('Le maximum doit être au moins égal au minimum.');
  });
});
