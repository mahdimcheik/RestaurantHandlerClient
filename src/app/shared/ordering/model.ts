import {
  IngredientDetails,
  MenuDetails,
  OptionGroupDetails,
  ProductDetails,
  PublicMenu,
  PublicProduct,
  PublicReplacement,
} from '../../core/api/generated';

/**
 * Modèle neutre d'un produit à personnaliser et d'un menu à composer, construit depuis la carte
 * publique (commande en ligne) ou la carte de gestion. Les bornes sont déjà résolues
 * (règles propres au produit), les éléments archivés écartés et les listes triées.
 */

export interface ChoiceOption {
  id: string;
  name: string;
  extraPriceCents: number;
  isAvailable: boolean;
  imageUrl?: string | null;
}

export interface ChoiceGroup {
  id: string;
  label: string;
  min: number;
  max: number;
  maxPerChoice: number;
  choices: ChoiceOption[];
}

export interface ProductIngredient {
  id: string;
  name: string;
  isRemovable: boolean;
  /** Faux : en rupture (retiré d'office s'il est retirable). */
  isAvailable: boolean;
  /** Prix de référence, connu seulement sur la carte publique (surcoût d'un remplacement). */
  priceCents: number | null;
}

/** Ingrédient proposé en remplacement (ADR-0012). */
export interface ReplacementOption {
  id: string;
  name: string;
  priceCents: number | null;
}

export interface CustomizableProduct {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  priceCents: number;
  isAvailable: boolean;
  ingredients: ProductIngredient[];
  groups: ChoiceGroup[];
}

export interface MenuOption {
  productId: string;
  name: string;
  extraPriceCents: number;
  isAvailable: boolean;
  imageUrl?: string | null;
}

export interface MenuSlot {
  id: string;
  label: string;
  min: number;
  max: number;
  options: MenuOption[];
}

export interface ComposableMenu {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  priceCents: number;
  isAvailable: boolean;
  slots: MenuSlot[];
}

function manageGroup(group: OptionGroupDetails): ChoiceGroup {
  const rules = group.productRules ?? {
    minChoices: group.minChoices,
    maxChoices: group.maxChoices,
  };
  return {
    id: group.id,
    label: group.label,
    min: rules.minChoices,
    max: rules.maxChoices,
    maxPerChoice: Math.max(1, group.maxPerChoice),
    choices: [...group.choices]
      .sort((a, b) => a.position - b.position)
      .map(({ id, name, extraPriceCents, isAvailable, imageUrl }) => ({
        id,
        name,
        extraPriceCents,
        isAvailable,
        imageUrl,
      })),
  };
}

/** Produit de la carte de gestion : règles propres au produit, groupes archivés écartés. */
export function fromManageProduct(product: ProductDetails): CustomizableProduct {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    imageUrl: product.imageUrl,
    priceCents: product.priceCents,
    isAvailable: product.isActive && product.isAvailable,
    ingredients: product.composition.ingredients.map((ingredient) => ({
      id: ingredient.ingredientId,
      name: ingredient.name,
      isRemovable: ingredient.isRemovable,
      isAvailable: ingredient.isAvailable,
      priceCents: null,
    })),
    groups: product.optionGroups
      .filter((group) => !group.isArchived)
      .sort((a, b) => a.position - b.position)
      .map(manageGroup),
  };
}

/** Remplaçants proposés : ingrédients actifs, disponibles et « proposés en remplacement ». */
export function manageReplacements(ingredients: readonly IngredientDetails[]): ReplacementOption[] {
  return ingredients
    .filter((i) => i.isOfferedAsReplacement && i.isAvailable && !i.isArchived)
    .map((i) => ({ id: i.id, name: i.name, priceCents: null }));
}

/** Menu de la carte de gestion ; une option est commandable si son produit l'est. */
export function fromManageMenu(
  menu: MenuDetails,
  products: ReadonlyMap<string, ProductDetails>,
): ComposableMenu {
  return {
    id: menu.id,
    name: menu.name,
    description: menu.description,
    imageUrl: menu.imageUrl,
    priceCents: menu.priceCents,
    isAvailable: menu.isActive && !menu.isArchived,
    slots: [...menu.slots]
      .sort((a, b) => a.position - b.position)
      .map((slot) => ({
        id: slot.id,
        label: slot.label,
        min: slot.minChoices,
        max: slot.maxChoices,
        options: slot.options.map((option) => {
          const product = products.get(option.productId);
          return {
            productId: option.productId,
            name: option.productName,
            extraPriceCents: option.extraPriceCents,
            isAvailable: !!product && product.isActive && product.isAvailable,
            imageUrl: product?.imageUrl,
          };
        }),
      })),
  };
}

/** Produit de la carte publique : bornes déjà résolues par le serveur, ordre de la carte. */
export function fromPublicProduct(product: PublicProduct): CustomizableProduct {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    imageUrl: product.imageUrl,
    priceCents: product.priceCents,
    isAvailable: product.isAvailable,
    ingredients: product.ingredients.map((ingredient) => ({
      id: ingredient.ingredientId,
      name: ingredient.name,
      isRemovable: ingredient.isRemovable,
      isAvailable: !ingredient.isForcedRemoved,
      priceCents: ingredient.priceCents,
    })),
    groups: product.optionGroups.map((group) => ({
      id: group.id,
      label: group.label,
      min: group.minChoices,
      max: group.maxChoices,
      maxPerChoice: Math.max(1, group.maxPerChoice),
      choices: group.choices.map(({ id, name, extraPriceCents, isAvailable, imageUrl }) => ({
        id,
        name,
        extraPriceCents,
        isAvailable,
        imageUrl,
      })),
    })),
  };
}

export function publicReplacements(
  replacements: readonly PublicReplacement[],
): ReplacementOption[] {
  return replacements.map((r) => ({ id: r.ingredientId, name: r.name, priceCents: r.priceCents }));
}

export function fromPublicMenu(menu: PublicMenu): ComposableMenu {
  return {
    id: menu.id,
    name: menu.name,
    description: menu.description,
    imageUrl: menu.imageUrl,
    priceCents: menu.priceCents,
    isAvailable: menu.isAvailable,
    slots: menu.slots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      min: slot.minChoices,
      max: slot.maxChoices,
      options: slot.options.map((option) => ({ ...option })),
    })),
  };
}

/**
 * Surcoût affiché d'un remplacement : `max(0, écart des prix de référence)`, ou `null` si les
 * prix ne sont pas connus. Simple indication : le serveur recalcule (R2).
 */
export function replacementSurcharge(
  ingredient: ProductIngredient,
  replacement: ReplacementOption,
): number | null {
  if (ingredient.priceCents === null || replacement.priceCents === null) {
    return null;
  }
  return Math.max(0, replacement.priceCents - ingredient.priceCents);
}
