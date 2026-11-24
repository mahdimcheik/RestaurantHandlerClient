import { TestBed } from '@angular/core/testing';
import { Dish } from '../../data-access/card-sections';
import { IngredientsInfo } from './ingredients-info';

describe('IngredientsInfo', () => {
  const dish = (overrides: Partial<Dish>): Dish => ({
    id: 'burger',
    name: 'Burger',
    description: 'Pain brioché, steak haché.',
    priceCents: 1000,
    isAvailable: true,
    isMenu: false,
    hasOptions: false,
    ingredients: [],
    link: ['/commander/produit', 'burger'],
    ...overrides,
  });

  function render(value: Dish): HTMLElement {
    const fixture = TestBed.createComponent(IngredientsInfo);
    fixture.componentRef.setInput('dish', value);
    fixture.componentRef.setInput('titleId', 'titre');
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('liste les ingrédients à droite et met la description en bas', () => {
    const element = render(
      dish({
        ingredients: [
          {
            ingredientId: 'oignon',
            name: 'Oignon',
            isRemovable: true,
            isForcedRemoved: true,
            priceCents: 0,
          },
        ],
      }),
    );

    expect(element.querySelector('.ingredient-list__name')?.textContent).toBe('Oignon');
    expect(element.querySelector('.ingredient-list__status')?.textContent).toBe('Rupture');
    expect(element.querySelector('.ingredients-info__description')?.textContent).toBe(
      'Pain brioché, steak haché.',
    );
    expect(element.querySelector('.ingredients-info__text')).toBeNull();
  });

  it('sans ingrédients, met la description à leur place', () => {
    const element = render(dish({}));

    expect(element.querySelector('.ingredient-list')).toBeNull();
    expect(
      element.querySelector('.ingredients-info__content .ingredients-info__text')?.textContent,
    ).toBe('Pain brioché, steak haché.');
    expect(element.querySelector('.ingredients-info__description')).toBeNull();
  });
  it('pour un menu, liste ses produits par rubrique à la place des ingrédients', () => {
    const element = render(
      dish({
        isMenu: true,
        description: 'Un burger et une boisson.',
        slots: [
          {
            id: 'plat',
            label: 'Plat',
            minChoices: 1,
            maxChoices: 1,
            options: [
              { productId: 'burger', name: 'Burger', isAvailable: true, extraPriceCents: 0 },
              { productId: 'wrap', name: 'Wrap', isAvailable: true, extraPriceCents: 150 },
            ],
          },
          {
            id: 'boisson',
            label: 'Boisson',
            minChoices: 1,
            maxChoices: 1,
            options: [{ productId: 'coca', name: 'Coca', isAvailable: false, extraPriceCents: 0 }],
          },
        ],
      }),
    );

    expect([...element.querySelectorAll('.eyebrow')].map((title) => title.textContent)).toEqual([
      'Plat',
      'Boisson',
    ]);
    expect(
      [...element.querySelectorAll('.ingredient-list__name')].map((name) => name.textContent),
    ).toEqual(['Burger', 'Wrap', 'Coca']);
    expect(element.querySelector('.ingredient-list__extra')?.textContent?.trim()).toMatch(
      /^\+ 1,50\s€$/,
    );
    expect(element.querySelector('.ingredient-list__status')?.textContent).toBe('Indisponible');
    expect(element.querySelector('.ingredients-info__description')?.textContent).toBe(
      'Un burger et une boisson.',
    );
  });
});
