import { OptionGroupDetails, ProductDetails } from '../../core/api/generated';
import { Customization } from './data-access/counter-cart';

/** Bornes d'un groupe pour ce produit (règles propres au produit, sinon celles du groupe). */
export interface GroupRules {
  min: number;
  max: number;
  maxPerChoice: number;
}

export function groupRules(group: OptionGroupDetails): GroupRules {
  const rules = group.productRules ?? {
    minChoices: group.minChoices,
    maxChoices: group.maxChoices,
  };
  return {
    min: rules.minChoices,
    max: rules.maxChoices,
    maxPerChoice: Math.max(1, group.maxPerChoice),
  };
}

/** Groupe à choix unique : une touche sélectionne (et remplace le choix précédent). */
export function isSingleChoice(group: OptionGroupDetails): boolean {
  const rules = groupRules(group);
  return rules.max === 1;
}

export function activeGroups(product: ProductDetails): OptionGroupDetails[] {
  return product.optionGroups
    .filter((group) => !group.isArchived)
    .sort((a, b) => a.position - b.position);
}

/** Le produit a un choix obligatoire : il ne peut pas partir en une touche. */
export function requiresChoice(product: ProductDetails): boolean {
  return activeGroups(product).some((group) => groupRules(group).min > 0);
}

/** Quelque chose à personnaliser : un ingrédient retirable ou un groupe d'options. */
export function isCustomizable(product: ProductDetails): boolean {
  return (
    product.composition.ingredients.some((ingredient) => ingredient.isRemovable) ||
    activeGroups(product).length > 0
  );
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
export function chosenCount(group: OptionGroupDetails, state: CustomizationState): number {
  return group.choices.reduce((sum, choice) => sum + (state.choices[choice.id] ?? 0), 0);
}

/** Groupes dont le minimum n'est pas atteint (le serveur refuserait la ligne). */
export function missingGroups(
  product: ProductDetails,
  state: CustomizationState,
): OptionGroupDetails[] {
  return activeGroups(product).filter((group) => chosenCount(group, state) < groupRules(group).min);
}

/**
 * Personnalisation au format du panier, avec ses libellés pour le ticket. `ingredientName`
 * donne le nom d'un remplaçant (catalogue des ingrédients).
 */
export function toCustomization(
  product: ProductDetails,
  state: CustomizationState,
  ingredientName: (id: string) => string,
): Customization {
  const result: Customization = { modifications: [], optionChoices: [], labels: [] };
  for (const ingredient of product.composition.ingredients) {
    const change = state.ingredients[ingredient.ingredientId];
    if (!ingredient.isRemovable || !change) {
      continue;
    }
    if (change.removed) {
      result.modifications.push({ type: 'Remove', ingredientId: ingredient.ingredientId });
      result.labels.push($localize`:@@counter.without:Sans ${ingredient.name}:name:`);
    } else if (change.replacementId) {
      result.modifications.push({
        type: 'Replace',
        ingredientId: ingredient.ingredientId,
        substituteIngredientId: change.replacementId,
      });
      result.labels.push(`${ingredient.name} → ${ingredientName(change.replacementId)}`);
    }
  }
  for (const group of activeGroups(product)) {
    for (const choice of [...group.choices].sort((a, b) => a.position - b.position)) {
      const quantity = state.choices[choice.id] ?? 0;
      if (quantity > 0) {
        result.optionChoices.push({ choiceId: choice.id, quantity });
        result.labels.push(quantity > 1 ? `${choice.name} × ${quantity}` : choice.name);
      }
    }
  }
  return result;
}
