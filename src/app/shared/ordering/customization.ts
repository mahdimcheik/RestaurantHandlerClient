import { Customization, MenuChoice, OrderLine } from './cart';
import { ChoiceGroup, ChoiceOption, CustomizableProduct, ProductIngredient } from './model';

/** Groupe à choix unique : une touche sélectionne (et remplace le choix précédent). */
export function isSingleChoice(group: ChoiceGroup): boolean {
  return group.max === 1;
}

/** Le produit a un choix obligatoire : il ne peut pas partir en une touche. */
export function requiresChoice(product: CustomizableProduct): boolean {
  return product.groups.some((group) => group.min > 0);
}

/** Quelque chose à personnaliser : un ingrédient retirable ou un groupe d'options. */
export function isCustomizable(product: CustomizableProduct): boolean {
  return product.ingredients.some((i) => i.isRemovable) || product.groups.length > 0;
}

/** Réglage d'un ingrédient de la composition : retiré, ou remplacé par un autre. */
export interface IngredientChange {
  removed: boolean;
  replacementId: string | null;
}

export interface CustomizationState {
  ingredients: Record<string, IngredientChange>;
  /** Quantité par identifiant de choix d'option. */
  choices: Record<string, number>;
}

export const EMPTY_STATE: CustomizationState = { ingredients: {}, choices: {} };

export function stateOf(customization: Customization): CustomizationState {
  const state: CustomizationState = { ingredients: {}, choices: {} };
  for (const modification of customization.modifications) {
    if (modification.type === 'Remove') {
      state.ingredients[modification.ingredientId] = { removed: true, replacementId: null };
    } else if (modification.type === 'Replace' && modification.substituteIngredientId) {
      state.ingredients[modification.ingredientId] = {
        removed: false,
        replacementId: modification.substituteIngredientId,
      };
    }
  }
  for (const choice of customization.optionChoices) {
    state.choices[choice.choiceId] = choice.quantity ?? 1;
  }
  return state;
}

/** Nombre de choix retenus dans un groupe (quantités comprises). */
export function chosenCount(group: ChoiceGroup, state: CustomizationState): number {
  return group.choices.reduce((sum, choice) => sum + (state.choices[choice.id] ?? 0), 0);
}

/** Choix retenus dans un groupe, pour un récapitulatif (« Frites », « Sauce × 2 »). */
export function chosenLabels(group: ChoiceGroup, state: CustomizationState): string[] {
  return group.choices.flatMap((choice) => {
    const quantity = state.choices[choice.id] ?? 0;
    if (quantity === 0) {
      return [];
    }
    return [quantity > 1 ? `${choice.name} × ${quantity}` : choice.name];
  });
}

/** Groupes dont le minimum n'est pas atteint (le serveur refuserait la ligne). */
export function missingGroups(
  product: CustomizableProduct,
  state: CustomizationState,
): ChoiceGroup[] {
  return product.groups.filter((group) => chosenCount(group, state) < group.min);
}

export function canAddChoice(
  group: ChoiceGroup,
  choice: ChoiceOption,
  state: CustomizationState,
): boolean {
  return (
    choice.isAvailable &&
    (state.choices[choice.id] ?? 0) < group.maxPerChoice &&
    chosenCount(group, state) < group.max
  );
}

/** Choix unique : une touche sélectionne, une seconde désélectionne. */
export function pickChoice(
  state: CustomizationState,
  group: ChoiceGroup,
  choice: ChoiceOption,
): CustomizationState {
  const selected = (state.choices[choice.id] ?? 0) > 0;
  const choices = { ...state.choices };
  group.choices.forEach((other) => delete choices[other.id]);
  if (!selected) {
    choices[choice.id] = 1;
  }
  return { ...state, choices };
}

/** Un de plus ou un de moins, dans les bornes du groupe. */
export function stepChoice(
  state: CustomizationState,
  group: ChoiceGroup,
  choice: ChoiceOption,
  delta: 1 | -1,
): CustomizationState {
  if (delta > 0 && !canAddChoice(group, choice, state)) {
    return state;
  }
  const quantity = Math.max(0, (state.choices[choice.id] ?? 0) + delta);
  return { ...state, choices: { ...state.choices, [choice.id]: quantity } };
}

export function setIngredient(
  state: CustomizationState,
  ingredientId: string,
  change: IngredientChange,
): CustomizationState {
  return { ...state, ingredients: { ...state.ingredients, [ingredientId]: change } };
}

/** Règle d'un groupe ou d'un emplacement, à lire à côté de son titre. */
export function ruleText(min: number, max: number): string {
  if (min === max) {
    return `choisir ${min}`;
  }
  return min > 0 ? `de ${min} à ${max}` : `facultatif, ${max} au plus`;
}

/**
 * Personnalisation au format du panier, avec ses libellés pour le ticket. `ingredientName`
 * donne le nom d'un remplaçant.
 */
export function toCustomization(
  product: CustomizableProduct,
  state: CustomizationState,
  ingredientName: (id: string) => string,
): Customization {
  const result: Customization = { modifications: [], optionChoices: [], labels: [] };
  for (const ingredient of product.ingredients) {
    const change = state.ingredients[ingredient.id];
    if (!ingredient.isRemovable) {
      continue;
    }
    if (!change?.replacementId && (change?.removed || !ingredient.isAvailable)) {
      result.modifications.push({ type: 'Remove', ingredientId: ingredient.id });
      result.labels.push(removalLabel(ingredient));
    } else if (change?.replacementId) {
      result.modifications.push({
        type: 'Replace',
        ingredientId: ingredient.id,
        substituteIngredientId: change.replacementId,
      });
      result.labels.push(`${ingredient.name} → ${ingredientName(change.replacementId)}`);
    }
  }
  for (const group of product.groups) {
    for (const choice of group.choices) {
      const quantity = state.choices[choice.id] ?? 0;
      if (quantity > 0) {
        result.optionChoices.push({ choiceId: choice.id, quantity });
        result.labels.push(quantity > 1 ? `${choice.name} × ${quantity}` : choice.name);
      }
    }
  }
  return result;
}

function removalLabel(ingredient: ProductIngredient): string {
  return ingredient.isAvailable ? `Sans ${ingredient.name}` : `Sans ${ingredient.name} (rupture)`;
}

/**
 * Retrait imposé des ingrédients retirables en rupture (R7) : le serveur refuse une ligne qui ne
 * les retire ni ne les remplace. Ajouté à l'envoi, sans toucher au panier stocké, pour qu'un
 * ingrédient revenu en stock soit de nouveau servi.
 */
export function withForcedRemovals(
  customization: Customization,
  product: CustomizableProduct | undefined,
): Customization {
  const handled = new Set(
    customization.modifications
      .filter((m) => m.type === 'Remove' || m.type === 'Replace')
      .map((m) => m.ingredientId),
  );
  const forced = (product?.ingredients ?? []).filter(
    (i) => i.isRemovable && !i.isAvailable && !handled.has(i.id),
  );
  if (forced.length === 0) {
    return customization;
  }
  return {
    ...customization,
    modifications: [
      ...customization.modifications,
      ...forced.map((i) => ({ type: 'Remove' as const, ingredientId: i.id })),
    ],
    labels: [...customization.labels, ...forced.map(removalLabel)],
  };
}

/** Ligne du panier telle qu'elle sera servie, retraits imposés compris. */
export function lineWithForcedRemovals(
  line: OrderLine,
  products: ReadonlyMap<string, CustomizableProduct>,
): OrderLine {
  if (line.kind === 'product') {
    const customization = withForcedRemovals(line.customization, products.get(line.productId));
    return customization === line.customization ? line : { ...line, customization };
  }
  let changed = false;
  const choices = line.choices.map((choice): MenuChoice => {
    const customization = withForcedRemovals(choice.customization, products.get(choice.productId));
    changed ||= customization !== choice.customization;
    return customization === choice.customization ? choice : { ...choice, customization };
  });
  return changed ? { ...line, choices } : line;
}

/** Message d'une ligne dont un produit n'est plus commandable (même texte que le serveur). */
export function unavailableMessage(
  line: OrderLine,
  products: ReadonlyMap<string, CustomizableProduct>,
): string | null {
  if (line.kind === 'product') {
    const product = products.get(line.productId);
    return product && !product.isAvailable ? `${product.name} n'est plus disponible.` : null;
  }
  const choice = line.choices.find((c) => products.get(c.productId)?.isAvailable === false);
  return choice ? `${line.name} : ${choice.productName} n'est plus disponible.` : null;
}
