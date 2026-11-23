import { Component, computed, input } from '@angular/core';
import {
  OrderChannel,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../../core/api/generated';
import { Icon, IconName } from '../icon/icon';

type Tone = 'warning' | 'info' | 'success' | 'muted';

const STATUS: Record<OrderStatus, { label: string; icon: IconName; tone: Tone }> = {
  PendingPayment: {
    label: $localize`:@@order.status.pendingPayment:Paiement en cours`,
    icon: 'card',
    tone: 'muted',
  },
  AwaitingApproval: {
    label: $localize`:@@order.status.awaitingApproval:À valider`,
    icon: 'alert',
    tone: 'warning',
  },
  Confirmed: { label: $localize`:@@order.status.confirmed:Confirmée`, icon: 'check', tone: 'info' },
  InPreparation: {
    label: $localize`:@@order.status.inPreparation:En préparation`,
    icon: 'flame',
    tone: 'info',
  },
  Ready: { label: $localize`:@@order.status.ready:Prête`, icon: 'bell', tone: 'success' },
  Completed: { label: $localize`:@@order.status.completed:Retirée`, icon: 'done', tone: 'muted' },
  NoShow: { label: $localize`:@@order.status.noShow:Non venu`, icon: 'noShow', tone: 'muted' },
  Refused: { label: $localize`:@@order.status.refused:Refusée`, icon: 'remove', tone: 'muted' },
  Cancelled: { label: $localize`:@@order.status.cancelled:Annulée`, icon: 'remove', tone: 'muted' },
};

/** Statuts définitifs : plus aucun geste possible. */
export const FINAL_STATUSES: readonly OrderStatus[] = [
  'Completed',
  'NoShow',
  'Refused',
  'Cancelled',
];

export function statusLabel(status: OrderStatus): string {
  return STATUS[status].label;
}

export function channelLabel(channel: OrderChannel): string {
  return channel === 'Counter'
    ? $localize`:@@order.channel.counter:Comptoir`
    : $localize`:@@order.channel.online:En ligne`;
}

const METHODS: Record<PaymentMethod, string> = {
  SumupOnline: $localize`:@@payment.method.online:En ligne`,
  OnSiteCard: $localize`:@@payment.method.card:Carte`,
  OnSiteCash: $localize`:@@payment.method.cash:Espèces`,
  OnSiteOther: $localize`:@@payment.method.other:Autre`,
};

export function paymentMethodLabel(method: PaymentMethod): string {
  return METHODS[method];
}

const PAYMENT_STATUSES: Record<PaymentStatus, string> = {
  Pending: $localize`:@@payment.status.pending:En attente`,
  Successful: $localize`:@@payment.status.successful:Réussi`,
  Failed: $localize`:@@payment.status.failed:Échec`,
  Cancelled: $localize`:@@payment.status.cancelled:Abandonné`,
  Refunded: $localize`:@@payment.status.refunded:Remboursé`,
};

export function paymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUSES[status];
}

/** Statut d'une commande : icône **et** libellé, jamais la couleur seule. */
@Component({
  selector: 'app-order-status',
  imports: [Icon],
  host: { class: 'status', '[class]': "'status--' + info().tone" },
  template: `<app-icon [name]="info().icon" /><span>{{ info().label }}</span>`,
})
export class OrderStatusBadge {
  readonly status = input.required<OrderStatus>();
  protected readonly info = computed(() => STATUS[this.status()]);
}
