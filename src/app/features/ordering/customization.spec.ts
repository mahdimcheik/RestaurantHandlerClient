import { OptionGroupDetails } from '../../core/api/generated';
import {
  groupRules,
  isCustomizable,
  missingGroups,
  requiresChoice,
  stateOf,
  toCustomization,
} from './customization';
import { product } from './testing';

const group = (extra: Partial<OptionGroupDetails> = {}): OptionGroupDetails => ({
  id: 'g1',
  label: 'Boisson',
  minChoices: 0,
  maxChoices: 1,
  maxPerChoice: 1,
  freeChoices: 0,
  extraChoicePriceCents: 0,
  isArchived: false,
  position: 0,
  productCount: 1,
  choices: [
    { id: 'coca', name: 'Coca', position: 0, extraPriceCents: 0, isAvailable: true },
    { id: 'eau', name: 'Eau', position: 1, extraPriceCents: 0, isAvailable: true },
  ],
  ...extra,
});

const burger = product('p1', 'Burger', {
  composition: {
    ingredients: [
      { ingredientId: 'oignon', name: 'Oignon', isRemovable: true, isAvailable: true },
      { ingredientId: 'pain', name: 'Pain', isRemovable: false, isAvailable: true },
      { ingredientId: 'cheddar', name: 'Cheddar', isRemovable: true, isAvailable: true },
    ],
  },
  optionGroups: [group({ productRules: { minChoices: 1, maxChoices: 1, freeChoices: 1 } })],
});

describe('customization', () => {
  it('applique les bornes propres au produit avant celles du groupe', () => {
    expect(groupRules(burger.optionGroups[0])).toEqual({ min: 1, max: 1, maxPerChoice: 1 });
    expect(requiresChoice(burger)).toBe(true);
    expect(requiresChoice(product('p2', 'Frites'))).toBe(false);
    expect(isCustomizable(product('p2', 'Frites'))).toBe(false);
  });

  it('signale le groupe obligatoire non choisi', () => {
    const state = stateOf({ modifications: [], optionChoices: [], labels: [] });
    expect(missingGroups(burger, state).map((g) => g.label)).toEqual(['Boisson']);
    state.choices['eau'] = 1;
    expect(missingGroups(burger, state)).toEqual([]);
  });

  it('produit retraits, remplacements et choix, avec leurs libellés', () => {
    const customization = toCustomization(
      burger,
      {
        ingredients: {
          oignon: { removed: true, replacementId: null },
          cheddar: { removed: false, replacementId: 'chevre' },
          pain: { removed: true, replacementId: null },
        },
        choices: { coca: 2 },
      },
      () => 'Chèvre',
    );

    expect(customization.modifications).toEqual([
      { type: 'Remove', ingredientId: 'oignon' },
      { type: 'Replace', ingredientId: 'cheddar', substituteIngredientId: 'chevre' },
    ]);
    expect(customization.optionChoices).toEqual([{ choiceId: 'coca', quantity: 2 }]);
    expect(customization.labels).toEqual(['Sans Oignon', 'Cheddar → Chèvre', 'Coca × 2']);
    expect(stateOf(customization).ingredients['cheddar']).toEqual({
      removed: false,
      replacementId: 'chevre',
    });
  });
});
