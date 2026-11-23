import { Component, computed, inject, input, output, signal } from '@angular/core';
import { form, submit, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { OrderDetails, PaymentMethod } from '../../../core/api/generated';
import { apiErrorMessage } from '../../../core/http/api-error';
import { eurosRule, focusFirstInvalid } from '../../../shared/forms/validation';
import { ManageOrdersService } from '../../../shared/services/manage-orders.service';
import { Icon, IconName } from '../../../shared/ui/icon/icon';
import { paymentMethodLabel } from '../../../shared/ui/order-status/order-status';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { EurosPipe, parseEuros } from '../../../shared/utils/money';
import { isConflict } from '../conflict';

type OnSiteMethod = Extract<PaymentMethod, 'OnSiteCard' | 'OnSiteCash' | 'OnSiteOther'>;

const METHODS: readonly { method: OnSiteMethod; icon: IconName }[] = [
  { method: 'OnSiteCard', icon: 'card' },
  { method: 'OnSiteCash', icon: 'cash' },
  { method: 'OnSiteOther', icon: 'plus' },
];

let nextId = 0;

/**
 * Encaissement déclaratif sur place (US-E05-3) : une touche par moyen encaisse tout le reste,
 * le paiement mixte enregistre un montant partiel. Montants et reste viennent du serveur.
 */
@Component({
  selector: 'app-payment-panel',
  imports: [Icon, EurosPipe, TextField],
  template: `
    <section class="payment" [attr.aria-labelledby]="id + '-title'">
      <h2 [id]="id + '-title'" i18n="@@payment.title">Encaissement</h2>
      <dl class="payment__amounts">
        <div>
          <dt i18n="@@payment.total">Total</dt>
          <dd>{{ order().totalCents | euros }}</dd>
        </div>
        @if (order().paidCents > 0) {
          <div>
            <dt i18n="@@payment.paid">Déjà payé</dt>
            <dd>{{ order().paidCents | euros }}</dd>
          </div>
        }
        <div class="payment__due">
          <dt i18n="@@payment.due">Reste à encaisser</dt>
          <dd>{{ remaining() | euros }}</dd>
        </div>
      </dl>

      <p class="field__hint" i18n="@@payment.oneTap">
        Une touche enregistre tout le reste avec ce moyen, après encaissement sur la caisse.
      </p>
      <div class="payment__methods">
        @for (option of methods; track option.method) {
          <button
            type="button"
            class="btn btn--icon payment__method"
            [disabled]="busy()"
            (click)="declare(option.method)"
          >
            <app-icon [name]="option.icon" />{{ label(option.method) }}
          </button>
        }
      </div>

      <details class="payment__mixed">
        <summary i18n="@@payment.mixed">Paiement mixte</summary>
        <form class="form" novalidate (submit)="declarePart($event)">
          <app-text-field
            [field]="partForm.amount"
            label="Montant encaissé (€)"
            i18n-label="@@payment.amount"
            inputmode="decimal"
          />
          <fieldset class="segmented">
            <legend class="segmented__legend" i18n="@@payment.method">Moyen</legend>
            @for (option of methods; track option.method) {
              <label class="segmented__option">
                <input
                  type="radio"
                  class="visually-hidden"
                  [name]="id + '-method'"
                  [checked]="partMethod() === option.method"
                  (change)="partMethod.set(option.method)"
                />
                {{ label(option.method) }}
              </label>
            }
          </fieldset>
          <div class="form__actions">
            <button type="submit" class="btn" [disabled]="busy()" i18n="@@payment.recordPart">
              Enregistrer ce montant
            </button>
          </div>
        </form>
      </details>

      @if (error()) {
        <p class="alert alert--error" role="alert">{{ error() }}</p>
      }
    </section>
  `,
})
export class PaymentPanel {
  private readonly orders = inject(ManageOrdersService);

  readonly order = input.required<OrderDetails>();
  /** Commande à jour après chaque encaissement enregistré. */
  readonly paid = output<OrderDetails>();
  /** 409 : la commande a changé, le parent la relit. */
  readonly conflict = output<void>();

  protected readonly id = `payment-${nextId++}`;
  protected readonly methods = METHODS;
  protected readonly label = paymentMethodLabel;
  /** Affichage seulement : les deux montants viennent du serveur. */
  protected readonly remaining = computed(() => this.order().totalCents - this.order().paidCents);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected readonly partMethod = signal<OnSiteMethod>('OnSiteCard');
  private readonly partModel = signal({ amount: '' });
  protected readonly partForm = form(this.partModel, (path) => {
    eurosRule(path.amount, { required: true });
    validate(path.amount, ({ value }) => {
      const cents = parseEuros(value());
      return cents !== null && cents <= 0
        ? { kind: 'positive', message: $localize`:@@payment.positive:Montant supérieur à zéro.` }
        : null;
    });
  });

  protected declare(method: OnSiteMethod): Promise<void> {
    return this.send(method, null);
  }

  protected async declarePart(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.partForm, {
      action: async () => {
        await this.send(this.partMethod(), parseEuros(this.partModel().amount));
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }

  /** `amountCents` nul : le serveur enregistre tout le reste à payer. */
  private async send(method: OnSiteMethod, amountCents: number | null): Promise<void> {
    this.error.set('');
    this.busy.set(true);
    try {
      const order = await firstValueFrom(
        this.orders.declarePayment(
          this.order().id,
          amountCents === null ? { method } : { method, amountCents },
        ),
      );
      this.partModel.set({ amount: '' });
      this.paid.emit(order);
    } catch (error) {
      if (isConflict(error)) {
        this.conflict.emit();
      }
      this.error.set(apiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
