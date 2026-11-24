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
 * un choix unique, lignes à quantité sinon. L'état vit chez le parent (`[(state)]`).
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
      <ul class="picker__rows">
        @for (choice of current.choices; track choice.id) {
          <li class="picker__row">
            <span class="picker__name">
              @if (choice.imageUrl) {
                <img
                  class="picker__image"
                  [ngSrc]="choice.imageUrl"
                  width="96"
                  height="96"
                  alt=""
                />
              }
              {{ choice.name }}
              @if (!choice.isAvailable) {
                <span class="badge badge--danger">Rupture</span>
              } @else if (choice.extraPriceCents > 0) {
                <span class="picker__price">+ {{ choice.extraPriceCents | euros }}</span>
              }
            </span>
            <span class="stepper">
              <button
                type="button"
                class="icon-button"
                [disabled]="quantityOf(choice) === 0"
                (click)="step(choice, -1)"
              >
                <app-icon name="minus" />
                <span class="visually-hidden">Un de moins : {{ choice.name }}</span>
              </button>
              <span class="stepper__value stepper__value--small">{{ quantityOf(choice) }}</span>
              <button
                type="button"
                class="icon-button"
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
