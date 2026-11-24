import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardSection } from '../../data-access/card-sections';
import { sectionTabId } from '../category-rail/category-rail';
import { DishCard } from '../dish-card/dish-card';

/** Panneau de la rubrique choisie dans le rail : titre, présentation et grille des articles. */
@Component({
  selector: 'app-dish-panel',
  imports: [RouterLink, DishCard],
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
          <li app-dish-card [dish]="dish"></li>
        } @empty {
          <li class="empty" i18n="@@shop.emptySection">Rien dans cette rubrique pour le moment.</li>
        }
      </ul>
    }
    <p class="order-dishes__note">
      <a routerLink="/allergenes" i18n="@@shop.allergensLink"
        >Informations allergènes disponibles</a
      >
      <ng-container i18n="@@shop.pricesTtc"> · Prix TTC.</ng-container>
    </p>
  `,
})
export class DishPanel {
  readonly section = input<CardSection>();

  protected readonly labelledBy = computed(() => {
    const section = this.section();
    return section ? sectionTabId(section.id) : null;
  });
}
