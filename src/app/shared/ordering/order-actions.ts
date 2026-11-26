import { OrderDetails, OrderStatus } from '../../core/api/generated';

/** Statuts d'une commande acceptée et pas encore remise : annulable par le Manager. */
const ACTIVE: readonly OrderStatus[] = ['Confirmed', 'InPreparation', 'Ready'];

/** Gestes proposés sur une commande. Sert seulement à masquer des boutons : le serveur décide. */
export interface OrderActions {
  /** Remise au client (`Prête` ; toute commande est payée en ligne avant la cuisine). */
  complete: boolean;
  noShow: boolean;
  cancel: boolean;
  refund: boolean;
}

/**
 * Gestes visibles selon le statut et l'heure (`now` en ms). `graceMinutes` : délai
 * de grâce après l'heure de retrait avant « client non venu » (réglage du restaurant).
 */
export function availableActions(
  order: OrderDetails,
  now: number,
  graceMinutes: number,
): OrderActions {
  const ready = order.status === 'Ready';
  const pastGrace = now >= new Date(order.pickupAt).getTime() + graceMinutes * 60_000;
  const onlinePaid = order.payments.some(
    (payment) => payment.method === 'SumupOnline' && payment.status === 'Successful',
  );

  return {
    complete: ready,
    noShow: ready && pastGrace,
    cancel: ACTIVE.includes(order.status),
    refund:
      (order.status === 'Cancelled' || order.status === 'NoShow') &&
      (onlinePaid || !!order.paymentIssue),
  };
}
