import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Dish } from '../../data-access/card-sections';

/**
 * Ingrédients d'un produit, ouverts depuis le bouton « info » de sa carte : visuel du produit à
 * gauche, ingrédients (avec leur image s'il y en a une) à droite, description en bas sur deux lignes
 * au plus. Sans ingrédients, la description entière prend leur place à droite. Un ingrédient en
 * rupture est signalé par un libellé, pas seulement par le style.
 */
@Component({
  selector: 'app-ingredients-info',
  imports: [NgOptimizedImage, Icon],
  host: { class: 'ingredients-info' },
  template: `
    @let item = dish();
    <div class="ingredients-info__media">
      @if (item.imageUrl) {
        <img
          class="ingredients-info__image"
          [ngSrc]="item.imageUrl"
          width="480"
          height="480"
          alt=""
        />
      } @else {
        <app-icon name="products" />
      }
    </div>
    <div class="ingredients-info__content">
      <h2 class="display-title display-title--md ingredients-info__title" [id]="titleId()">
        {{ item.name }}
      </h2>
      @if (item.ingredients.length > 0) {
        <p class="eyebrow">Ingrédients</p>
        <ul class="ingredient-list">
          @for (ingredient of item.ingredients; track ingredient.ingredientId) {
            <li
              class="ingredient-list__item"
              [class.ingredient-list__item--out]="ingredient.isForcedRemoved"
            >
              <span class="ingredient-list__media" aria-hidden="true">
                @if (ingredient.imageUrl) {
                  <img
                    class="ingredient-list__image"
                    [ngSrc]="ingredient.imageUrl"
                    width="96"
                    height="96"
                    alt=""
                  />
                }
              </span>
              <span class="ingredient-list__name">{{ ingredient.name }}</span>
              @if (ingredient.isForcedRemoved) {
                <span class="ingredient-list__status">Rupture</span>
              }
            </li>
          }
        </ul>
      } @else if (item.description) {
        <p class="ingredients-info__text">{{ item.description }}</p>
      }
    </div>
    @if (item.ingredients.length > 0 && item.description) {
      <p class="ingredients-info__description">{{ item.description }}</p>
    }
  `,
})
export class IngredientsInfo {
  readonly dish = input.required<Dish>();
  /** Identifiant du titre, qui nomme le dialogue. */
  readonly titleId = input.required<string>();
}
