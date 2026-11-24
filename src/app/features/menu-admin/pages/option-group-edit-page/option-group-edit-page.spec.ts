import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { OptionGroupDetails } from '../../../../core/api/generated';
import {
  clickButton,
  control,
  envelope,
  fill,
  polyfillDialog,
  submitForm,
  text,
} from '../../../../shared/testing';
import { OptionGroupEditPage } from './option-group-edit-page';

const sauces: OptionGroupDetails = {
  id: 'g1',
  label: 'Sauces',
  imageUrl: null,
  position: 0,
  minChoices: 0,
  maxChoices: 3,
  maxPerChoice: 1,
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
    polyfillDialog();
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

  /** Ajoute un choix par le dialogue ; `index` = rang du champ « Nom » du dialogue à l'écran. */
  async function addChoice(name: string, index: number, extraPrice?: string): Promise<void> {
    clickButton(fixture, 'Ajouter un choix');
    fill(fixture, 'Nom', name, index);
    if (extraPrice) {
      fill(fixture, 'Surcoût (€)', extraPrice, index);
    }
    clickButton(fixture, 'Ajouter');
    await fixture.whenStable();
  }

  it('reprend le prix de référence de l’ingrédient lié à un choix ajouté encore à 0 €', async () => {
    fixture.detectChanges();
    http.expectOne('/manage/ingredients').flush(
      envelope([
        {
          id: 'i-cheddar',
          name: 'Cheddar',
          priceCents: 80,
          isOfferedAsReplacement: true,
          isAvailable: true,
          isArchived: false,
        },
      ]),
    );
    http.expectOne('/manage/products').flush(envelope([]));
    await fixture.whenStable();

    clickButton(fixture, 'Ajouter un choix');
    fill(fixture, 'Ingrédient lié', 'i-cheddar');
    await fixture.whenStable();
    expect(control(fixture, 'Surcoût (€)').value).toBe('0,80');

    // Un surcoût déjà saisi n'est pas écrasé.
    fill(fixture, 'Ingrédient lié', '');
    fill(fixture, 'Surcoût (€)', '1,00');
    fill(fixture, 'Ingrédient lié', 'i-cheddar');
    await fixture.whenStable();
    expect(control(fixture, 'Surcoût (€)').value).toBe('1,00');
  });

  it('crée un groupe avec ses choix, prix convertis en centimes', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    flushCaches();
    await fixture.whenStable();

    expect(text(fixture)).toContain("Aucun choix pour l'instant.");
    fill(fixture, 'Libellé', 'Taille');
    await addChoice('29 cm', 0);
    await addChoice('33 cm', 1, '3');
    clickButton(fixture, 'Créer le groupe');

    const request = http.expectOne('/manage/option-groups');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      label: 'Taille',
      minChoices: 1,
      maxChoices: 1,
      maxPerChoice: 1,
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
    await addChoice('Algérienne', 2);
    clickButton(fixture, 'Enregistrer');

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

  it('n’ajoute rien quand le dialogue est annulé ou le nom manque', async () => {
    await open();
    clickButton(fixture, 'Ajouter un choix');
    clickButton(fixture, 'Ajouter');
    await fixture.whenStable();
    expect(text(fixture)).toContain('Ce champ est obligatoire.');
    fill(fixture, 'Nom', 'Algérienne', 2);
    const dialog = fixture.nativeElement.querySelector('app-choice-add-dialog dialog');
    [...dialog.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent?.trim() === 'Annuler')
      .click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('.stack-list__item').length).toBe(2);
    expect(dialog.open).toBe(false);
  });

  it('place « Enregistrer » à côté d’« Archiver », relié au formulaire', async () => {
    await open();
    const toolbar = fixture.nativeElement.querySelector('.page-head .toolbar') as HTMLElement;
    const labels = [
      ...toolbar.querySelectorAll(':scope > button, :scope > app-archive-button > button'),
    ].map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Archiver', 'Enregistrer']);
    expect(toolbar.querySelector('button[type=submit]')?.getAttribute('form')).toBe(
      'option-group-form',
    );
  });
});
