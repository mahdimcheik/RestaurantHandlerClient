import { NgOptimizedImage } from '@angular/common';
import { Component, input, model, output } from '@angular/core';
import { Icon } from '../ui/icon/icon';
import { EurosPipe } from '../utils/money';
import {
  canAddChoice,
  CustomizationState,
  isSingleChoice,
  pickChoice,
  stepChoice,
} from './customization';
import { ChoiceGroup, ChoiceOption } from './model';

/**
 * Choix d'un groupe d'options dans ses bornes : tuiles (avec la photo du choix s'il en a une) pour
 * un choix unique, cartes en rangées avec leur compteur « − n + » en bas sinon. L'état vit chez le parent (`[(state)]`).
 */
@Component({
  selector: 'app-option-group',
  imports: [NgOptimizedImage, Icon, EurosPipe],
  template: `
    @let current = group();
    @if (single()) {
      <div class="tiles tiles--compact">
        @for (choice of current.choices; track choice.id) {
          <button
            type="button"
            class="tile"
            [class.tile--media]="!!choice.imageUrl"
            [attr.aria-pressed]="quantityOf(choice) > 0"
            [disabled]="!choice.isAvailable"
            (click)="pick(choice)"
          >
            @if (choice.imageUrl) {
              <img class="tile__image" [ngSrc]="choice.imageUrl" width="240" height="180" alt="" />
            }
            <span class="tile__name">{{ choice.name }}</span>
            @if (!choice.isAvailable) {
              <span class="tile__meta">Rupture</span>
            } @else if (choice.extraPriceCents > 0) {
              <span class="tile__meta">+ {{ choice.extraPriceCents | euros }}</span>
            }
          </button>
        }
      </div>
    } @else {
      <ul class="choice-cards">
        @for (choice of current.choices; track choice.id) {
          <li
            class="choice-card"
            [class.choice-card--chosen]="quantityOf(choice) > 0"
            [class.choice-card--out]="!choice.isAvailable"
          >
            @if (choice.imageUrl) {
              <img
                class="choice-card__image"
                [ngSrc]="choice.imageUrl"
                width="240"
                height="180"
                alt=""
              />
            }
            <span class="choice-card__name">{{ choice.name }}</span>
            @if (!choice.isAvailable) {
              <span class="choice-card__meta">Rupture</span>
            } @else if (choice.extraPriceCents > 0) {
              <span class="choice-card__meta">+ {{ choice.extraPriceCents | euros }}</span>
            }
            <span
              class="choice-card__counter"
              role="group"
              [attr.aria-label]="'Quantité : ' + choice.name"
            >
              <button
                type="button"
                class="dish-counter__button"
                [disabled]="quantityOf(choice) === 0"
                (click)="step(choice, -1)"
              >
                <app-icon name="minus" />
                <span class="visually-hidden">Un de moins : {{ choice.name }}</span>
              </button>
              <span class="dish-counter__value" aria-live="polite">{{ quantityOf(choice) }}</span>
              <button
                type="button"
                class="dish-counter__button dish-counter__button--add"
                [disabled]="!canAdd(choice)"
                (click)="step(choice, 1)"
              >
                <app-icon name="plus" />
                <span class="visually-hidden">Un de plus : {{ choice.name }}</span>
              </button>
            </span>
          </li>
        }
      </ul>
    }
  `,
})
export class OptionGroup {
  readonly group = input.required<ChoiceGroup>();
  readonly state = model.required<CustomizationState>();
  /** Un choix unique vient d'être fait (sélection ou désélection). */
  readonly picked = output<void>();

  protected single(): boolean {
    return isSingleChoice(this.group());
  }

  protected quantityOf(choice: ChoiceOption): number {
    return this.state().choices[choice.id] ?? 0;
  }

  protected canAdd(choice: ChoiceOption): boolean {
    return canAddChoice(this.group(), choice, this.state());
  }

  protected pick(choice: ChoiceOption): void {
    this.state.update((state) => pickChoice(state, this.group(), choice));
    this.picked.emit();
  }

  protected step(choice: ChoiceOption, delta: 1 | -1): void {
    this.state.update((state) => stepChoice(state, this.group(), choice, delta));
  }
}
