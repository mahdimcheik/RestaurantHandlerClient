import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PublicCard } from '../../core/api/generated';

/** Carte publique de test : burger personnalisable (taille obligatoire), boisson, menu. */
export const CARD: PublicCard = {
  categories: [
    {
      id: 'c1',
      name: 'Burgers',
      products: [
        {
          id: 'burger',
          name: 'Burger',
          kind: 'Dish',
          priceCents: 1000,
          isAvailable: true,
          ingredients: [
            {
              ingredientId: 'oignon',
              name: 'Oignon',
              isRemovable: true,
              isForcedRemoved: false,
              priceCents: 50,
            },
            {
              ingredientId: 'cheddar',
              name: 'Cheddar',
              isRemovable: true,
              isForcedRemoved: false,
              priceCents: 100,
            },
          ],
          optionGroups: [
            {
              id: 'taille',
              label: 'Taille',
              minChoices: 1,
              maxChoices: 1,
              maxPerChoice: 1,
              freeChoices: 1,
              extraChoicePriceCents: 0,
              choices: [
                { id: 'petite', name: 'Petite', extraPriceCents: 0, isAvailable: true },
                { id: 'grande', name: 'Grande', extraPriceCents: 200, isAvailable: true },
              ],
            },
          ],
        },
        {
          id: 'cola',
          name: 'Cola',
          kind: 'Drink',
          priceCents: 300,
          isAvailable: true,
          ingredients: [],
          optionGroups: [],
        },
      ],
    },
  ],
  menus: [
    {
      id: 'midi',
      name: 'Menu midi',
      priceCents: 1300,
      isAvailable: true,
      slots: [
        {
          id: 's-plat',
          label: 'Plat',
          minChoices: 1,
          maxChoices: 1,
          options: [{ productId: 'burger', name: 'Burger', extraPriceCents: 0, isAvailable: true }],
        },
        {
          id: 's-boisson',
          label: 'Boisson',
          minChoices: 1,
          maxChoices: 1,
          options: [{ productId: 'cola', name: 'Cola', extraPriceCents: 0, isAvailable: true }],
        },
      ],
    },
  ],
  replacements: [{ ingredientId: 'chevre', name: 'Chèvre', priceCents: 250 }],
  opening: { status: 'Open', asapDelayMinutes: 15 },
};

/** Laisse passer réponses HTTP, effets et rendu. */
export async function settle(ms = 0): Promise<void> {
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve, ms));
  TestBed.tick();
}

@Component({ template: '' })
export class EmptyPage {}
