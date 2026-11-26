import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { OrderDetails, OrderItemDto } from '../../../core/api/generated';
import { Icon } from '../../../shared/ui/icon/icon';
import { OrderStatusBadge } from '../../../shared/ui/order-status/order-status';
import { RestaurantTimePipe } from '../../../shared/utils/restaurant-time';
import { modificationView, ModificationView } from '../kitchen-format';

interface LineView {
  id: string;
  quantity: number;
  name: string;
  modifications: ModificationView[];
  components: LineView[];
}

function line(item: OrderItemDto): LineView {
  return {
    id: item.id,
    quantity: item.quantity,
    name: item.name,
    modifications: item.modifications.map(modificationView),
    components: item.components.map(line),
  };
}

/**
 * Bon de cuisine : numéro, heure, client, lignes et personnalisations mises en évidence. Le
 * numéro ouvre le détail avec les prix.
 */
@Component({
  selector: 'app-kitchen-ticket',
  imports: [NgTemplateOutlet, Icon, OrderStatusBadge, RestaurantTimePipe],
  host: { class: 'kds-ticket' },
  template: `
    <div class="kds-ticket__head">
      <h3 class="kds-ticket__number">
        <button type="button" class="kds-ticket__open" (click)="details.emit()">
          <span class="visually-hidden">Détails et prix de la commande n°</span>
          {{ order().dailyNumber }}
          <app-icon name="info" />
        </button>
      </h3>
      <p class="kds-ticket__meta">
        <span class="kds-ticket__time">
          <app-icon name="clock" />
          {{ order().pickupAt | restaurantTime }}
          @if (order().pickupMode === 'Asap') {
            <span>dès que possible</span>
          }
        </span>
        @if (order().customerLabel) {
          <span>{{ order().customerLabel }}</span>
        }
      </p>
      <app-order-status [status]="order().status" />
    </div>

    <ul class="kds-ticket__lines">
      @for (item of lines(); track item.id) {
        <li class="kds-ticket__line">
          <ng-container *ngTemplateOutlet="lineView; context: { $implicit: item }" />
        </li>
      }
    </ul>

    @if (order().customerNote) {
      <p class="kds-ticket__note">
        <app-icon name="alert" />
        <span><span class="kds-ticket__note-label">Note :</span> {{ order().customerNote }}</span>
      </p>
    }

    <button
      type="button"
      class="btn kds-ticket__action"
      [disabled]="busy()"
      [attr.aria-busy]="busy()"
      (click)="advance.emit()"
    >
      @if (order().status === 'Confirmed') {
        <app-icon name="flame" />
        <span>Commencer</span>
      } @else {
        <app-icon name="bell" />
        <span>Prête</span>
      }
      <span class="visually-hidden">n° {{ order().dailyNumber }}</span>
    </button>

    <ng-template #lineView let-item>
      <span class="kds-ticket__item">
        <span class="kds-ticket__qty">{{ item.quantity }}×</span> {{ item.name }}
      </span>
      @if (item.modifications.length > 0) {
        <ul class="kds-ticket__mods">
          @for (modification of item.modifications; track $index) {
            <li class="kds-ticket__mod" [class.kds-ticket__mod--strong]="modification.strong">
              @if (modification.icon) {
                <app-icon [name]="modification.icon" />
              }
              {{ modification.text }}
            </li>
          }
        </ul>
      }
      @if (item.components.length > 0) {
        <ul class="kds-ticket__components">
          @for (component of item.components; track component.id) {
            <li>
              <ng-container *ngTemplateOutlet="lineView; context: { $implicit: component }" />
            </li>
          }
        </ul>
      }
    </ng-template>
  `,
})
export class KitchenTicket {
  readonly order = input.required<OrderDetails>();
  readonly busy = input(false);
  readonly advance = output<void>();
  /** Ouvre le détail avec les prix, sans quitter l'écran. */
  readonly details = output<void>();

  protected readonly lines = computed(() => this.order().items.map(line));
}
