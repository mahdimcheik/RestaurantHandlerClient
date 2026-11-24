import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { Icon } from '../../../../shared/ui/icon/icon';
import { EurosPipe } from '../../../../shared/utils/money';
import { Dish } from '../../data-access/card-sections';

/**
 * Détail d'un article, ouvert depuis le bouton « info » de sa carte : visuel à gauche, puis à
 * droite les ingrédients d'un produit ou, pour un menu, ses rubriques et leurs produits au choix
 * (avec leur image s'il y en a une, et le supplément éventuel), description en bas sur deux lignes
 * au plus. Sans liste, la description entière prend sa place à droite. Un ingrédient en rupture ou
 * un produit indisponible est signalé par un libellé, pas seulement par le style.
 */
@Component({
  selector: 'app-ingredients-info',
  imports: [NgOptimizedImage, Icon, EurosPipe],
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
        <app-icon [name]="item.isMenu ? 'menus' : 'products'" />
      }
    </div>
    <div class="ingredients-info__content">
      <h2 class="display-title display-title--md ingredients-info__title" [id]="titleId()">
        {{ item.name }}
      </h2>
      @if (slots().length > 0) {
        @for (slot of slots(); track slot.id) {
          <p class="eyebrow">{{ slot.label }}</p>
          <ul class="ingredient-list">
            @for (option of slot.options; track option.productId) {
              <li
                class="ingredient-list__item"
                [class.ingredient-list__item--out]="!option.isAvailable"
              >
                <span class="ingredient-list__media" aria-hidden="true">
                  @if (option.imageUrl) {
                    <img
                      class="ingredient-list__image"
                      [ngSrc]="option.imageUrl"
                      width="96"
                      height="96"
                      alt=""
                    />
                  }
                </span>
                <span class="ingredient-list__name">{{ option.name }}</span>
                @if (!option.isAvailable) {
                  <span class="ingredient-list__status">Indisponible</span>
                } @else if (option.extraPriceCents > 0) {
                  <span class="ingredient-list__extra">+ {{ option.extraPriceCents | euros }}</span>
                }
              </li>
            }
          </ul>
        }
      } @else if (item.ingredients.length > 0) {
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
    @if (hasList() && item.description) {
      <p class="ingredients-info__description">{{ item.description }}</p>
    }
  `,
})
export class IngredientsInfo {
  readonly dish = input.required<Dish>();
  /** Identifiant du titre, qui nomme le dialogue. */
  readonly titleId = input.required<string>();

  protected readonly slots = computed(() => this.dish().slots ?? []);
  protected readonly hasList = computed(
    () => this.slots().length > 0 || this.dish().ingredients.length > 0,
  );
}
