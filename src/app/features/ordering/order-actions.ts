import { OrderDetails, OrderStatus } from '../../core/api/generated';
import { FINAL_STATUSES } from '../../shared/ui/order-status/order-status';

/** Statuts d'une commande acceptée et pas encore remise : annulable par le Manager. */
const ACTIVE: readonly OrderStatus[] = ['Confirmed', 'InPreparation', 'Ready'];

/** Gestes proposés sur une commande. Sert seulement à masquer des boutons : le serveur décide. */
export interface OrderActions {
  accept: boolean;
  refuse: boolean;
  /** Encaissement sur place (paiement mixte possible). */
  collect: boolean;
  /** Remise au client (`Prête` et payée). */
  complete: boolean;
  /** Prête mais pas encore payée : à encaisser avant la remise. */
  collectBeforeHandover: boolean;
  noShow: boolean;
  cancel: boolean;
  refund: boolean;
}

/**
 * Gestes visibles selon le statut, le paiement et l'heure (`now` en ms). `graceMinutes` : délai
 * de grâce après l'heure de retrait avant « client non venu » (réglage du restaurant).
 */
export function availableActions(
  order: OrderDetails,
  now: number,
  graceMinutes: number,
): OrderActions {
  const isFinal = FINAL_STATUSES.includes(order.status);
  const onSite = order.paymentChoice === 'OnSite';
  const ready = order.status === 'Ready';
  const pastGrace = now >= new Date(order.pickupAt).getTime() + graceMinutes * 60_000;
  const onlinePaid = order.payments.some(
    (payment) => payment.method === 'SumupOnline' && payment.status === 'Successful',
  );

  return {
    accept: order.status === 'AwaitingApproval',
    refuse: order.status === 'AwaitingApproval',
    collect: onSite && !order.isPaid && !isFinal && order.status !== 'AwaitingApproval',
    complete: ready && order.isPaid,
    collectBeforeHandover: ready && !order.isPaid,
    noShow: ready && pastGrace,
    cancel: ACTIVE.includes(order.status),
    refund:
      (order.status === 'Cancelled' || order.status === 'Refused' || order.status === 'NoShow') &&
      (onlinePaid || !!order.paymentIssue),
  };
}
