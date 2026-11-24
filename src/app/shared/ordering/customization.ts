import { Customization } from './cart';
import { ChoiceGroup, ChoiceOption, CustomizableProduct } from './model';

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
    if (!ingredient.isRemovable || !change) {
      continue;
    }
    if (change.removed) {
      result.modifications.push({ type: 'Remove', ingredientId: ingredient.id });
      result.labels.push(`Sans ${ingredient.name}`);
    } else if (change.replacementId) {
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
