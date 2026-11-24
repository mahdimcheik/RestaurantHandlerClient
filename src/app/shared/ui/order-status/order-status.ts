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
    label: 'Paiement en cours',
    icon: 'card',
    tone: 'muted',
  },
  AwaitingApproval: {
    label: 'À valider',
    icon: 'alert',
    tone: 'warning',
  },
  Confirmed: { label: 'Confirmée', icon: 'check', tone: 'info' },
  InPreparation: {
    label: 'En préparation',
    icon: 'flame',
    tone: 'info',
  },
  Ready: { label: 'Prête', icon: 'bell', tone: 'success' },
  Completed: { label: 'Retirée', icon: 'done', tone: 'muted' },
  NoShow: { label: 'Non venu', icon: 'noShow', tone: 'muted' },
  Refused: { label: 'Refusée', icon: 'remove', tone: 'muted' },
  Cancelled: { label: 'Annulée', icon: 'remove', tone: 'muted' },
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

const CUSTOMER_STATUS: Record<OrderStatus, string> = {
  PendingPayment: 'Paiement en attente',
  AwaitingApproval: 'En attente de validation par Greenadine',
  Confirmed: 'Confirmée',
  InPreparation: 'En préparation',
  Ready: 'Prête — venez la chercher',
  Completed: 'Retirée',
  NoShow: 'Non retirée',
  Refused: 'Refusée par Greenadine',
  Cancelled: 'Annulée',
};

/** Statut tel que le client le lit (suivi, historique, bandeau). */
export function customerStatusLabel(status: OrderStatus): string {
  return CUSTOMER_STATUS[status];
}

export function channelLabel(channel: OrderChannel): string {
  return channel === 'Counter' ? 'Comptoir' : 'En ligne';
}

const METHODS: Record<PaymentMethod, string> = {
  SumupOnline: 'En ligne',
  OnSiteCard: 'Carte',
  OnSiteCash: 'Espèces',
  OnSiteOther: 'Autre',
};

export function paymentMethodLabel(method: PaymentMethod): string {
  return METHODS[method];
}

const PAYMENT_STATUSES: Record<PaymentStatus, string> = {
  Pending: 'En attente',
  Successful: 'Réussi',
  Failed: 'Échec',
  Cancelled: 'Abandonné',
  Refunded: 'Remboursé',
};

export function paymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUSES[status];
}

/** Statut d'une commande : icône **et** libellé, jamais la couleur seule. */
@Component({
  selector: 'app-order-status',
  imports: [Icon],
  host: { class: 'status', '[class]': "'status--' + info().tone" },
  template: `<app-icon [name]="info().icon" /><span>{{ label() }}</span>`,
})
export class OrderStatusBadge {
  readonly status = input.required<OrderStatus>();
  /** Libellé côté client (« En attente de validation par Greenadine »…). */
  readonly customer = input(false);
  protected readonly info = computed(() => STATUS[this.status()]);
  protected readonly label = computed(() =>
    this.customer() ? CUSTOMER_STATUS[this.status()] : this.info().label,
  );
}
