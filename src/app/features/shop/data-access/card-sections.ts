import { PublicCard, PublicIngredient } from '../../../core/api/generated';

/** Article de la carte (produit ou menu) tel qu'affiché dans une rubrique. */
export interface Dish {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  priceCents: number;
  isAvailable: boolean;
  isMenu: boolean;
  /** Des choix à faire avant l'ajout (groupes d'options, ou composition d'un menu). */
  hasOptions: boolean;
  /** Ingrédients d'un produit (vide pour un menu). */
  ingredients: PublicIngredient[];
  link: string[];
}

/** Rubrique de la carte : les menus, puis chaque catégorie. */
export interface CardSection {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  isMenus: boolean;
  dishes: Dish[];
}

/** Rubriques de la carte publique : les menus d'abord (s'il y en a), puis les catégories. */
export function cardSections(card: PublicCard | null | undefined): CardSection[] {
  if (!card) {
    return [];
  }
  const menus: CardSection[] =
    card.menus.length > 0
      ? [
          {
            id: 'menus',
            name: 'Menus',
            imageUrl: card.menus.find((menu) => menu.imageUrl)?.imageUrl,
            isMenus: true,
            dishes: card.menus.map((menu) => ({
              id: menu.id,
              name: menu.name,
              description: menu.description,
              imageUrl: menu.imageUrl,
              priceCents: menu.priceCents,
              isAvailable: menu.isAvailable,
              isMenu: true,
              hasOptions: true,
              ingredients: [],
              link: ['/commander/menu', menu.id],
            })),
          },
        ]
      : [];
  return [
    ...menus,
    ...card.categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      imageUrl: category.imageUrl,
      isMenus: false,
      dishes: category.products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        priceCents: product.priceCents,
        isAvailable: product.isAvailable,
        isMenu: false,
        hasOptions: product.optionGroups.length > 0,
        ingredients: product.ingredients,
        link: ['/commander/produit', product.id],
      })),
    })),
  ];
}
