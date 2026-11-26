import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../../shared/ui/icon/icon';
import { EurosPipe } from '../../../../shared/utils/money';
import { Dish } from '../../data-access/card-sections';

/** Élément d'une liste de détail : ingrédient, choix d'option ou produit d'un menu. */
interface DetailItem {
  key: string;
  name: string;
  extraPriceCents: number;
  /** Libellé d'absence (« rupture », « indisponible »), vide si disponible. */
  status: string;
}

/** Liste nommée de la carte : les ingrédients, un groupe d'options ou une rubrique de menu. */
interface DetailBlock {
  key: string;
  label: string;
  items: DetailItem[];
}

/**
 * Article de la carte à consulter, en grand : visuel, nom, prix, description entière, puis le
 * détail visible sans clic — ingrédients et groupes d'options d'un produit, ou rubriques d'un menu
 * avec leurs produits au choix et suppléments. Le nom est le lien vers la fiche de commande,
 * étiré sur toute la carte. Une absence est signalée par un libellé, pas seulement par le style.
 */
@Component({
  selector: 'li[app-board-card]',
  host: { class: 'board-card', '[class.board-card--unavailable]': '!dish().isAvailable' },
  imports: [RouterLink, NgOptimizedImage, Icon, EurosPipe],
  template: `
    @let item = dish();
    <div class="board-card__media">
      @if (item.imageUrl) {
        <img class="board-card__image" [ngSrc]="item.imageUrl" width="480" height="480" alt="" />
      } @else {
        <app-icon [name]="item.isMenu ? 'menus' : 'products'" />
      }
    </div>
    <div class="board-card__body">
      <div class="board-card__head">
        <h3 class="board-card__name">
          <a class="board-card__link" [routerLink]="item.link" scroll="manual">{{ item.name }}</a>
        </h3>
        <span class="board-card__price">
          @if (item.isAvailable) {
            {{ item.priceCents | euros }}
          } @else if (item.isMenu) {
            Indisponible
          } @else {
            Rupture
          }
        </span>
      </div>
      @if (item.description) {
        <p class="board-card__description">{{ item.description }}</p>
      }
      @for (block of blocks(); track block.key) {
        <div class="board-card__detail">
          <p class="board-card__label">{{ block.label }}</p>
          <ul class="board-card__tags">
            @for (detail of block.items; track detail.key) {
              <li class="board-card__tag" [class.board-card__tag--out]="detail.status">
                <span class="board-card__tag-name">{{ detail.name }}</span>&ngsp;
                @if (detail.status) {
                  <span class="board-card__tag-status">({{ detail.status }})</span>
                } @else if (detail.extraPriceCents > 0) {
                  <span class="board-card__tag-extra">+ {{ detail.extraPriceCents | euros }}</span>
                }
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
})
export class BoardCard {
  readonly dish = input.required<Dish>();

  protected readonly blocks = computed<DetailBlock[]>(() => {
    const dish = this.dish();
    const ingredients: DetailBlock[] =
      dish.ingredients.length > 0
        ? [
            {
              key: 'ingredients',
              label: 'Ingrédients',
              items: dish.ingredients.map((ingredient) => ({
                key: ingredient.ingredientId,
                name: ingredient.name,
                extraPriceCents: 0,
                status: ingredient.isForcedRemoved ? 'rupture' : '',
              })),
            },
          ]
        : [];
    const options: DetailBlock[] = (dish.optionGroups ?? []).map((group) => ({
      key: `groupe-${group.id}`,
      label: group.label,
      items: group.choices.map((choice) => ({
        key: choice.id,
        name: choice.name,
        extraPriceCents: choice.extraPriceCents,
        status: choice.isAvailable ? '' : 'indisponible',
      })),
    }));
    const slots: DetailBlock[] = (dish.slots ?? []).map((slot) => ({
      key: `rubrique-${slot.id}`,
      label: slot.label,
      items: slot.options.map((option) => ({
        key: option.productId,
        name: option.name,
        extraPriceCents: option.extraPriceCents,
        status: option.isAvailable ? '' : 'indisponible',
      })),
    }));
    return [...ingredients, ...options, ...slots];
  });
}
