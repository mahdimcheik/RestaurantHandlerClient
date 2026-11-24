import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DOCUMENT, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { OrdersService } from '../../../../shared/services/orders.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { paymentMethodLabel } from '../../../../shared/ui/order-status/order-status';
import { EurosPipe, RatePipe } from '../../../../shared/utils/money';
import { RestaurantDateTimePipe } from '../../../../shared/utils/restaurant-time';
import { itemDetails } from '../../order-format';

/**
 * Justificatif d'une commande payée (US-E05-5) : restaurant (raison sociale, adresse, SIRET,
 * TVA), date, numéro, lignes, TVA par taux, total, moyen de paiement. Contenu provisoire, à
 * valider avec l'expert-comptable (question ouverte n° 2) ; ce n'est pas un ticket de caisse.
 */
@Component({
  selector: 'app-receipt-page',
  host: { class: 'shop' },
  imports: [RouterLink, EurosPipe, RatePipe, RestaurantDateTimePipe, Icon],
  templateUrl: './receipt-page.html',
})
export class ReceiptPage {
  private readonly orders = inject(OrdersService);
  private readonly window = inject(DOCUMENT).defaultView;

  readonly id = input.required<string>();

  protected readonly receipt = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.orders.receipt(params),
  });
  protected readonly value = computed(() =>
    this.receipt.hasValue() ? this.receipt.value() : undefined,
  );
  protected readonly error = computed(() => {
    const error = this.receipt.error();
    if (!error) {
      return '';
    }
    return error instanceof HttpErrorResponse && error.status === 404
      ? 'Commande introuvable sur ce compte.'
      : apiErrorMessage(error);
  });
  protected readonly netCents = computed(
    () => this.value()?.vat.reduce((sum, line) => sum + line.netCents, 0) ?? 0,
  );
  protected readonly payments = computed(
    () => this.value()?.payments.filter((payment) => payment.status === 'Successful') ?? [],
  );
  protected readonly itemDetails = itemDetails;
  protected readonly methodLabel = paymentMethodLabel;

  protected print(): void {
    this.window?.print();
  }
}
