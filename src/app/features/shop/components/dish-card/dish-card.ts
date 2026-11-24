import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../../shared/ui/icon/icon';
import { EurosPipe } from '../../../../shared/utils/money';
import { Dish } from '../../data-access/card-sections';

/**
 * Article de la carte (produit ou menu) dans la grille d'une rubrique : visuel, nom, description et
 * prix, ou « Rupture » / « Indisponible ». Ouvre la fiche sans faire défiler la carte. Un produit
 * qui a des ingrédients ou une description porte en plus un bouton « info », posé sur le visuel à côté du lien (un
 * bouton ne peut pas être imbriqué dans un lien). Sur la carte de commande (`count` fourni), un
 * compteur à côté du prix : « + » ajoute, « − » retire, le nombre est la quantité au panier.
 */
@Component({
  selector: 'li[app-dish-card]',
  host: { class: 'dish-tile', '[class.dish-tile--counter]': 'showCounter()' },
  imports: [RouterLink, NgOptimizedImage, Icon, EurosPipe],
  template: `
    @let item = dish();
    <a
      class="dish-card"
      [class.dish-card--unavailable]="!item.isAvailable"
      [routerLink]="item.link"
      scroll="manual"
    >
      <span class="dish-card__media">
        @if (item.imageUrl) {
          <img class="dish-card__image" [ngSrc]="item.imageUrl" width="320" height="240" alt="" />
        } @else {
          <app-icon [name]="item.isMenu ? 'menus' : 'products'" />
        }
      </span>
      <span class="dish-card__body">
        <span class="dish-card__name">{{ item.name }}</span>
        @if (item.description) {
          <span class="dish-card__description">{{ item.description }}</span>
        }
        @if (item.isAvailable) {
          <span class="dish-card__price">{{ item.priceCents | euros }}</span>
        } @else if (item.isMenu) {
          <span class="dish-card__price">Indisponible</span>
        } @else {
          <span class="dish-card__price">Rupture</span>
        }
      </span>
    </a>
    @if (showCounter()) {
      <span class="dish-counter" role="group" [attr.aria-label]="'Quantité : ' + item.name">
        @if (count()) {
          <button type="button" class="dish-counter__button" (click)="decrement.emit()">
            <app-icon name="minus" />
            <span class="visually-hidden">Retirer : {{ item.name }}</span>
          </button>
          <span class="dish-counter__value" aria-live="polite">{{ count() }}</span>
        }
        <button
          type="button"
          class="dish-counter__button dish-counter__button--add"
          [attr.aria-haspopup]="item.hasOptions ? 'dialog' : null"
          (click)="increment.emit()"
        >
          <app-icon name="plus" />
          <span class="visually-hidden">Ajouter : {{ item.name }}</span>
        </button>
      </span>
    }
    @if (item.ingredients.length > 0 || item.description) {
      <button type="button" class="dish-tile__info" aria-haspopup="dialog" (click)="info.emit()">
        <app-icon name="info" />
        <span class="visually-hidden">Informations : {{ item.name }}</span>
      </button>
    }
  `,
})
export class DishCard {
  readonly dish = input.required<Dish>();
  /** Quantité au panier ; absent (carte à consulter) : pas de compteur. */
  readonly count = input<number | null>(null);
  readonly increment = output<void>();
  readonly decrement = output<void>();

  protected readonly showCounter = computed(() => this.count() !== null && this.dish().isAvailable);
  /** Le client demande les ingrédients (ou, à défaut, la description) du produit. */
  readonly info = output<void>();
}
