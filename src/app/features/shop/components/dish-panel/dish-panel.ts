import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OrderLine } from '../../../../shared/ordering/cart';
import { CardSection, Dish } from '../../data-access/card-sections';
import { CartStore } from '../../data-access/cart.store';
import { sectionTabId } from '../category-rail/category-rail';
import { DishCard } from '../dish-card/dish-card';
import { IngredientsInfo } from '../ingredients-info/ingredients-info';
import { OrderDialog } from '../order-dialog/order-dialog';

/**
 * Panneau de la rubrique choisie dans le rail : titre, présentation et grille des articles, chacun
 * avec son compteur. « + » ajoute d'office un produit sans options, sinon ouvre sa fiche (choix
 * pas à pas) ; « − » retire une unité, ou demande le détail de la commande (`showCart`) quand
 * l'article y figure en plusieurs lignes différentes.
 */
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
          <li
            app-dish-card
            [dish]="dish"
            [count]="counts().get(dish.id) ?? 0"
            (increment)="increment(dish)"
            (decrement)="decrement(dish)"
            (info)="showIngredients(dish)"
          ></li>
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
  private readonly cart = inject(CartStore);
  private readonly router = inject(Router);

  readonly section = input<CardSection>();
  /** Plusieurs lignes différentes du même article : au client de choisir laquelle retirer. */
  readonly showCart = output<void>();

  /** Quantité au panier par produit ou menu. */
  protected readonly counts = computed(() => {
    const counts = new Map<string, number>();
    for (const line of this.cart.lines()) {
      const id = itemId(line);
      counts.set(id, (counts.get(id) ?? 0) + line.quantity);
    }
    return counts;
  });

  protected readonly labelledBy = computed(() => {
    const section = this.section();
    return section ? sectionTabId(section.id) : null;
  });

  /** Produit dont les ingrédients sont affichés dans le dialogue. */
  protected readonly ingredientsOf = signal<Dish | null>(null);
  protected readonly ingredientsOpen = signal(false);

  protected increment(dish: Dish): void {
    if (dish.hasOptions) {
      void this.router.navigate(dish.link, { scroll: 'manual' });
      return;
    }
    this.cart.addProduct(dish);
  }

  protected decrement(dish: Dish): void {
    const lines = this.cart.lines().filter((line) => itemId(line) === dish.id);
    if (lines.length > 1) {
      this.showCart.emit();
      return;
    }
    if (lines[0]) {
      this.cart.setQuantity(lines[0].key, lines[0].quantity - 1);
    }
  }

  protected showIngredients(dish: Dish): void {
    this.ingredientsOf.set(dish);
    this.ingredientsOpen.set(true);
  }
}

function itemId(line: OrderLine): string {
  return line.kind === 'product' ? line.productId : line.menuId;
}
