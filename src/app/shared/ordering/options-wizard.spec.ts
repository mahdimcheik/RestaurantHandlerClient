import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { clickButton, text } from '../testing';
import { CustomizationState, EMPTY_STATE } from './customization';
import { CustomizableProduct } from './model';
import { OptionsWizard } from './options-wizard';

const PIZZA: CustomizableProduct = {
  id: 'pizza',
  name: 'Pizza',
  priceCents: 1000,
  isAvailable: true,
  ingredients: [],
  groups: [
    {
      id: 'base',
      label: 'Base',
      min: 1,
      max: 1,
      maxPerChoice: 1,
      choices: [
        { id: 'tomate', name: 'Tomate', extraPriceCents: 0, isAvailable: true },
        { id: 'creme', name: 'Crème', extraPriceCents: 0, isAvailable: true },
      ],
    },
    {
      id: 'extras',
      label: 'Suppléments',
      min: 0,
      max: 3,
      maxPerChoice: 2,
      choices: [
        { id: 'olives', name: 'Olives', extraPriceCents: 50, isAvailable: true },
        { id: 'oeuf', name: 'Œuf', extraPriceCents: 100, isAvailable: true },
      ],
    },
  ],
};

@Component({
  imports: [OptionsWizard],
  template: `
    <app-options-wizard
      [product]="product"
      [(state)]="state"
      [total]="1250"
      (submit)="submitted = submitted + 1"
      (back)="backs = backs + 1"
    />
  `,
})
class Host {
  readonly product = PIZZA;
  readonly state = signal<CustomizationState>(EMPTY_STATE);
  submitted = 0;
  backs = 0;
}

describe('OptionsWizard', () => {
  let fixture: ComponentFixture<Host>;

  const button = (label: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (b) => b.textContent?.replace(/\s+/g, ' ').trim() === label,
    );
  const tile = (name: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.tile')].find(
      (t) => t.textContent?.includes(name),
    )!;
  const title = () =>
    (fixture.nativeElement as HTMLElement).querySelector('#wizard-title')?.textContent?.trim();
  const click = async (label: string) => {
    clickButton(fixture, label);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  it('bloque Suivant sous le minimum, puis avance seul après un choix unique', async () => {
    expect(text(fixture)).toContain('Pizza · étape 1 sur 3');
    expect(title()).toBe('Base');
    expect(button('Suivant')?.disabled).toBe(true);

    tile('Crème').click();
    await fixture.whenStable();

    expect(fixture.componentInstance.state().choices).toEqual({ creme: 1 });
    expect(title()).toBe('Suppléments');
    expect(text(fixture)).toContain('étape 2 sur 3');
  });

  it('propose Passer pour un groupe facultatif vide, puis le récapitulatif', async () => {
    tile('Tomate').click();
    await fixture.whenStable();
    expect(button('Suivant')).toBeUndefined();

    await click('Passer');

    expect(title()).toBe('Récapitulatif');
    expect(text(fixture)).toContain('Base Tomate');
    expect(text(fixture)).toContain('Suppléments Aucun');
    expect(text(fixture)).toContain('Ajouter au panier · 12,50');
  });

  it('revient en arrière sans perdre les choix, et quitte par Précédent à la première étape', async () => {
    tile('Tomate').click();
    await fixture.whenStable();
    await click('Un de plus : Olives');
    await click('Un de plus : Olives');
    await click('Précédent');

    expect(title()).toBe('Base');
    expect(tile('Tomate').getAttribute('aria-pressed')).toBe('true');
    await click('Suivant');
    await click('Suivant');
    expect(text(fixture)).toContain('Olives × 2');

    await click('Précédent');
    await click('Précédent');
    await click('Précédent');
    expect(fixture.componentInstance.backs).toBe(1);
  });

  it('corrige un groupe depuis le récapitulatif et y revient, puis valide', async () => {
    tile('Tomate').click();
    await fixture.whenStable();
    await click('Passer');

    await click('Modifier : Base');
    expect(title()).toBe('Base');
    tile('Crème').click();
    await fixture.whenStable();

    expect(title()).toBe('Récapitulatif');
    expect(text(fixture)).toContain('Base Crème');
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Ajouter au panier'))!
      .click();
    expect(fixture.componentInstance.submitted).toBe(1);
  });
});
