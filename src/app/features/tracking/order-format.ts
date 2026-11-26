import { OrderDetails, OrderItemDto, OrderStatus } from '../../core/api/generated';

/** Commande payée, pas encore remise : le client ne l'annule qu'en s'adressant au restaurant. */
const CANCEL_BY_PHONE: readonly OrderStatus[] = ['Confirmed', 'InPreparation', 'Ready'];

/** Afficher « pour annuler, appelez le restaurant… » (ADR-0013 : pas d'annulation en ligne). */
export function showsCancelHelp(order: OrderDetails): boolean {
  return CANCEL_BY_PHONE.includes(order.status);
}

/** Paiement en ligne non reçu : nouvel essai possible jusqu'à l'expiration. */
export function awaitsOnlinePayment(order: OrderDetails): boolean {
  return order.status === 'PendingPayment';
}

/** Motif d'une annulation, tel que saisi (dernier dans l'historique). */
export function closingReason(order: OrderDetails): string | null {
  if (order.status !== 'Cancelled') {
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

/** Payée par carte, ou paiement en ligne en attente. */
export function paymentText(order: OrderDetails): string {
  return order.isPaid ? 'Payée par carte' : 'Paiement en ligne non reçu';
}
