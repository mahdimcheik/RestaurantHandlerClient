import { OptionGroupDetails, ProductDetails } from '../../core/api/generated';
import {
  chosenLabels,
  isCustomizable,
  missingGroups,
  pickChoice,
  requiresChoice,
  stateOf,
  stepChoice,
  toCustomization,
  unavailableMessage,
  withForcedRemovals,
  lineWithForcedRemovals,
} from './customization';
import { OrderLine } from './cart';
import { fromManageProduct, fromPublicProduct, replacementSurcharge } from './model';

const manageProduct = (id: string, name: string, extra: Partial<ProductDetails> = {}) =>
  fromManageProduct({
    id,
    categoryId: 'c1',
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

const group = (extra: Partial<OptionGroupDetails> = {}): OptionGroupDetails => ({
  id: 'g1',
  label: 'Boisson',
  minChoices: 0,
  maxChoices: 1,
  maxPerChoice: 1,
  isArchived: false,
  position: 0,
  productCount: 1,
  choices: [
    { id: 'coca', name: 'Coca', position: 0, extraPriceCents: 0, isAvailable: true },
    { id: 'eau', name: 'Eau', position: 1, extraPriceCents: 0, isAvailable: true },
  ],
  ...extra,
});

const burger = manageProduct('p1', 'Burger', {
  composition: {
    ingredients: [
      { ingredientId: 'oignon', name: 'Oignon', isRemovable: true, isAvailable: true },
      { ingredientId: 'pain', name: 'Pain', isRemovable: false, isAvailable: true },
      { ingredientId: 'cheddar', name: 'Cheddar', isRemovable: true, isAvailable: true },
    ],
  },
  optionGroups: [group({ productRules: { minChoices: 1, maxChoices: 1 } })],
});

describe('customization', () => {
  it('applique les bornes propres au produit avant celles du groupe', () => {
    expect(burger.groups[0]).toMatchObject({ min: 1, max: 1, maxPerChoice: 1 });
    expect(requiresChoice(burger)).toBe(true);
    expect(requiresChoice(manageProduct('p2', 'Frites'))).toBe(false);
    expect(isCustomizable(manageProduct('p2', 'Frites'))).toBe(false);
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

  it('écarte les groupes archivés et trie groupes et choix', () => {
    const product = manageProduct('p3', 'Wrap', {
      optionGroups: [
        group({ id: 'b', position: 1 }),
        group({ id: 'a', position: 0 }),
        group({ id: 'x', isArchived: true }),
      ],
    });
    expect(product.groups.map((g) => g.id)).toEqual(['a', 'b']);
  });

  it('respecte les bornes : choix unique remplacé, maximum par choix et par groupe', () => {
    const sauces = { ...burger.groups[0], max: 2, maxPerChoice: 1 };
    const [coca, eau] = sauces.choices;
    let state = stateOf({ modifications: [], optionChoices: [], labels: [] });
    state = pickChoice(state, burger.groups[0], coca);
    state = pickChoice(state, burger.groups[0], eau);
    expect(state.choices).toEqual({ eau: 1 });

    state = stepChoice(state, sauces, eau, 1);
    expect(state.choices['eau']).toBe(1);
    state = stepChoice(state, sauces, coca, 1);
    expect(state.choices).toEqual({ eau: 1, coca: 1 });
  });

  it('liste les choix retenus d’un groupe pour le récapitulatif', () => {
    const drinks = burger.groups[0];
    expect(chosenLabels(drinks, { ingredients: {}, choices: {} })).toEqual([]);
    expect(chosenLabels(drinks, { ingredients: {}, choices: { coca: 2, eau: 0 } })).toEqual([
      'Coca × 2',
    ]);
  });

  it('lit la carte publique : rupture d’un ingrédient retirable et surcoût de remplacement', () => {
    const product = fromPublicProduct({
      id: 'p9',
      name: 'Burger',
      kind: 'Dish',
      priceCents: 1000,
      isAvailable: true,
      ingredients: [
        {
          ingredientId: 'cheddar',
          name: 'Cheddar',
          isRemovable: true,
          isForcedRemoved: true,
          priceCents: 100,
        },
      ],
      optionGroups: [],
    });
    const cheddar = product.ingredients[0];
    expect(cheddar.isAvailable).toBe(false);
    expect(replacementSurcharge(cheddar, { id: 'chevre', name: 'Chèvre', priceCents: 250 })).toBe(
      150,
    );
    expect(replacementSurcharge(cheddar, { id: 'tomate', name: 'Tomate', priceCents: 50 })).toBe(0);
  });
});

describe('rupture d’un ingrédient retirable', () => {
  const pizza = manageProduct('p2', 'Reine', {
    composition: {
      ingredients: [
        { ingredientId: 'tomate', name: 'Tomate', isRemovable: true, isAvailable: false },
        { ingredientId: 'jambon', name: 'Jambon', isRemovable: true, isAvailable: true },
      ],
    },
  });
  const products = new Map([[pizza.id, pizza]]);
  const plain = { modifications: [], optionChoices: [], labels: [] };

  it('retire d’office l’ingrédient en rupture sur la fiche', () => {
    const result = toCustomization(pizza, { ingredients: {}, choices: {} }, () => '');
    expect(result.modifications).toEqual([{ type: 'Remove', ingredientId: 'tomate' }]);
    expect(result.labels).toEqual(['Sans Tomate (rupture)']);
  });

  it('garde le remplacement choisi à la place du retrait', () => {
    const state = {
      ingredients: { tomate: { removed: false, replacementId: 'chevre' } },
      choices: {},
    };
    const result = toCustomization(pizza, state, () => 'Chèvre');
    expect(result.modifications).toEqual([
      { type: 'Replace', ingredientId: 'tomate', substituteIngredientId: 'chevre' },
    ]);
  });

  it('ajoute le retrait à une ligne nue du panier, une seule fois', () => {
    const forced = withForcedRemovals(plain, pizza);
    expect(forced.modifications).toEqual([{ type: 'Remove', ingredientId: 'tomate' }]);
    expect(withForcedRemovals(forced, pizza)).toBe(forced);
  });

  it('ne touche pas une ligne qui remplace déjà l’ingrédient', () => {
    const replaced = {
      ...plain,
      modifications: [
        { type: 'Replace' as const, ingredientId: 'tomate', substituteIngredientId: 'chevre' },
      ],
    };
    expect(withForcedRemovals(replaced, pizza)).toBe(replaced);
  });

  it('applique le retrait aux produits d’un menu', () => {
    const line: OrderLine = {
      kind: 'menu',
      key: 'k',
      menuId: 'm1',
      name: 'Menu midi',
      quantity: 1,
      choices: [{ slotId: 's1', productId: 'p2', productName: 'Reine', customization: plain }],
    };
    const served = lineWithForcedRemovals(line, products);
    expect(served.kind === 'menu' && served.choices[0].customization.modifications).toEqual([
      { type: 'Remove', ingredientId: 'tomate' },
    ]);
  });

  it('signale une ligne dont le produit n’est plus disponible', () => {
    const line: OrderLine = {
      kind: 'product',
      key: 'k',
      productId: 'p2',
      name: 'Reine',
      quantity: 1,
      customization: plain,
    };
    expect(unavailableMessage(line, products)).toBeNull();
    const gone = new Map([[pizza.id, { ...pizza, isAvailable: false }]]);
    expect(unavailableMessage(line, gone)).toBe("Reine n'est plus disponible.");
  });
});
