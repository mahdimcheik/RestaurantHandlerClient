import { OrderDetails, OrderItemDto, OrderStatus } from '../../core/api/generated';

/** Statuts où le client peut encore annuler (avant préparation) : masquage, le serveur décide. */
const CANCELLABLE: readonly OrderStatus[] = ['PendingPayment', 'AwaitingApproval', 'Confirmed'];

export function canCancel(order: OrderDetails): boolean {
  return CANCELLABLE.includes(order.status);
}

/** Paiement en ligne non reçu : nouvel essai ou bascule au paiement au retrait. */
export function awaitsOnlinePayment(order: OrderDetails): boolean {
  return order.status === 'PendingPayment' && order.paymentChoice === 'Online';
}

/** Motif d'un refus ou d'une annulation, tel que saisi (dernier dans l'historique). */
export function closingReason(order: OrderDetails): string | null {
  if (order.status !== 'Refused' && order.status !== 'Cancelled') {
    return null;
  }
  const entry = [...order.history].reverse().find((h) => h.status === order.status && h.reason);
  return entry?.reason ?? null;
}

/** Personnalisations d'une ligne (« Sans oignons », « Coca ×2 ») et composants d'un menu. */
export function itemDetails(item: OrderItemDto): string[] {
  const mods = (list: OrderItemDto['modifications']) =>
    list.map((m) => (m.quantity > 1 ? `${m.label} ×${m.quantity}` : m.label));
  return [
    ...mods(item.modifications),
    ...item.components.map((component) => {
      const details = mods(component.modifications);
      return details.length > 0 ? `${component.name} (${details.join(', ')})` : component.name;
    }),
  ];
}

/** Payée, à payer au retrait, ou paiement en ligne en attente. */
export function paymentText(order: OrderDetails): string {
  if (order.isPaid) {
    return 'Payée';
  }
  return order.paymentChoice === 'OnSite' ? 'À payer au retrait' : 'Paiement en ligne non reçu';
}
