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
});
