import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderDetails } from '../../../core/api/generated';
import { Icon } from '../../../shared/ui/icon/icon';
import {
  channelLabel,
  OrderStatusBadge,
  paymentMethodLabel,
} from '../../../shared/ui/order-status/order-status';
import { EurosPipe } from '../../../shared/utils/money';
import { RestaurantTimePipe } from '../../../shared/utils/restaurant-time';
import { modificationView } from '../kitchen-format';

/**
 * Détail d'une commande consulté depuis l'écran cuisine, sans le quitter : lignes avec leurs
 * prix, suppléments chiffrés, note, total, déjà payé et reste à encaisser. Une commande `Prête`
 * et payée se remet d'ici ; non payée, l'encaissement reste au back-office.
 */
@Component({
  selector: 'app-kitchen-order-details',
  imports: [NgTemplateOutlet, RouterLink, Icon, OrderStatusBadge, EurosPipe, RestaurantTimePipe],
  host: { class: 'kds-details' },
  template: `
    <p class="kds-details__meta">
      <span class="kds-ticket__time">
        <app-icon name="clock" />
        {{ order().pickupAt | restaurantTime }}
        @if (order().pickupMode === 'Asap') {
          <span>dès que possible</span>
        }
      </span>
      <span>{{ channel() }}</span>
      @if (order().customerLabel) {
        <span>{{ order().customerLabel }}</span>
      }
      <app-order-status [status]="order().status" />
    </p>

    <ul class="kds-details__lines">
      @for (item of order().items; track item.id) {
        <li>
          <ng-container *ngTemplateOutlet="lineView; context: { $implicit: item, priced: true }" />
        </li>
      }
    </ul>

    @if (order().customerNote) {
      <p class="kds-ticket__note">
        <app-icon name="alert" />
        <span><span class="kds-ticket__note-label">Note :</span> {{ order().customerNote }}</span>
      </p>
    }

    <dl class="kds-details__totals">
      <div class="kds-details__row kds-details__row--total">
        <dt>Total</dt>
        <dd>{{ order().totalCents | euros }}</dd>
      </div>
      @for (payment of paid(); track payment.id) {
        <div class="kds-details__row">
          <dt>Payé · {{ methodLabel(payment.method) }}</dt>
          <dd>{{ payment.amountCents | euros }}</dd>
        </div>
      }
      <div class="kds-details__row" [class.kds-details__row--due]="due() > 0">
        <dt>{{ due() > 0 ? 'Reste à encaisser' : 'Payée' }}</dt>
        <dd>
          @if (due() > 0) {
            {{ due() | euros }}
          } @else {
            <app-icon name="check" />
          }
        </dd>
      </div>
    </dl>

    @if (order().status === 'Ready') {
      @if (order().isPaid) {
        <button
          type="button"
          class="btn kds-ticket__action"
          [disabled]="busy()"
          [attr.aria-busy]="busy()"
          (click)="complete.emit()"
        >
          <app-icon name="done" />
          <span>Remis au client</span>
          <span class="visually-hidden">n° {{ order().dailyNumber }}</span>
        </button>
      } @else {
        <p class="kds-details__hint">
          À encaisser avant la remise :
          <a [routerLink]="['/gestion/commandes', order().id]">ouvrir au back-office</a>
        </p>
      }
    }

    <ng-template #lineView let-item let-priced="priced">
      <div class="kds-details__row">
        <span class="kds-ticket__item">
          <span class="kds-ticket__qty">{{ item.quantity }}×</span> {{ item.name }}
        </span>
        @if (priced) {
          <span class="kds-details__amount">{{ item.lineTotalCents | euros }}</span>
        } @else if (item.unitPriceCents > 0) {
          <span class="kds-details__amount">+ {{ item.unitPriceCents | euros }}</span>
        }
      </div>
      @if (priced && item.quantity > 1) {
        <p class="kds-details__unit">{{ item.lineTotalCents / item.quantity | euros }} l'unité</p>
      }
      @if (item.modifications.length > 0) {
        <ul class="kds-ticket__mods">
          @for (modification of item.modifications; track $index) {
            <li class="kds-details__row">
              <span
                class="kds-ticket__mod"
                [class.kds-ticket__mod--strong]="modification.type === 'Remove'"
              >
                {{ modView(modification).text }}
              </span>
              @if (modification.unitPriceCents > 0) {
                <span class="kds-details__amount">
                  + {{ modification.unitPriceCents * modification.quantity | euros }}
                </span>
              }
            </li>
          }
        </ul>
      }
      @if (item.components.length > 0) {
        <ul class="kds-ticket__components">
          @for (component of item.components; track component.id) {
            <li>
              <ng-container
                *ngTemplateOutlet="lineView; context: { $implicit: component, priced: false }"
              />
            </li>
          }
        </ul>
      }
    </ng-template>
  `,
})
export class KitchenOrderDetails {
  readonly order = input.required<OrderDetails>();
  readonly busy = input(false);
  readonly complete = output<void>();

  protected readonly channel = computed(() => channelLabel(this.order().channel));
  protected readonly paid = computed(() =>
    this.order().payments.filter((payment) => payment.status === 'Successful'),
  );
  protected readonly due = computed(() =>
    Math.max(0, this.order().totalCents - this.order().paidCents),
  );
  protected readonly methodLabel = paymentMethodLabel;
  protected readonly modView = modificationView;
}
