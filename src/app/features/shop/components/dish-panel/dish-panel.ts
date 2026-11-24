import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardSection, Dish } from '../../data-access/card-sections';
import { sectionTabId } from '../category-rail/category-rail';
import { DishCard } from '../dish-card/dish-card';
import { IngredientsInfo } from '../ingredients-info/ingredients-info';
import { OrderDialog } from '../order-dialog/order-dialog';

/** Panneau de la rubrique choisie dans le rail : titre, présentation et grille des articles. */
@Component({
  selector: 'app-dish-panel',
  imports: [RouterLink, DishCard, IngredientsInfo, OrderDialog],
  host: {
    class: 'order-dishes',
    role: 'tabpanel',
    tabindex: '0',
    '[attr.aria-labelledby]': 'labelledBy()',
  },
  template: `
    @if (section(); as current) {
      <h2 class="display-title display-title--md order-dishes__title">{{ current.name }}</h2>
      @if (current.description) {
        <p class="order-dishes__lead">{{ current.description }}</p>
      }
      <ul class="dish-grid">
        @for (dish of current.dishes; track dish.id) {
          <li app-dish-card [dish]="dish" (info)="showIngredients(dish)"></li>
        } @empty {
          <li class="empty">Rien dans cette rubrique pour le moment.</li>
        }
      </ul>
    }
    <p class="order-dishes__note">
      <a routerLink="/allergenes">Informations allergènes disponibles</a>
      · Prix TTC.
    </p>
    <app-order-dialog labelledBy="ingredients-title" [(open)]="ingredientsOpen">
      @if (ingredientsOf(); as dish) {
        <app-ingredients-info [dish]="dish" titleId="ingredients-title" />
      }
    </app-order-dialog>
  `,
})
export class DishPanel {
  readonly section = input<CardSection>();

  protected readonly labelledBy = computed(() => {
    const section = this.section();
    return section ? sectionTabId(section.id) : null;
  });

  /** Produit dont les ingrédients sont affichés dans le dialogue. */
  protected readonly ingredientsOf = signal<Dish | null>(null);
  protected readonly ingredientsOpen = signal(false);

  protected showIngredients(dish: Dish): void {
    this.ingredientsOf.set(dish);
    this.ingredientsOpen.set(true);
  }
}
