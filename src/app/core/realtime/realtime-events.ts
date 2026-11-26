import { OrderSummary } from '../api/generated';

/**
 * Événements poussés par le hub `/hubs/realtime` et leur contenu (JSON en camelCase).
 * Ils notifient seulement : la vérité reste l'API, relue à chaque (re)connexion.
 */
export interface RealtimeEvents {
  OrderCreated: OrderSummary;
  OrderStatusChanged: OrderSummary;
  PaymentAnomaly: { orderId: string; dailyNumber: number; issue: string | null };
  AvailabilityChanged: { scope: 'catalog' | 'opening' };
  /** Notification enregistrée pour l'utilisateur ; `icon` vaut `bell` pour une commande prête. */
  Notification: { id: string; type: string; message: string; link: string | null; icon: string };
}

export type RealtimeEventName = keyof RealtimeEvents;

export const REALTIME_EVENT_NAMES = [
  'OrderCreated',
  'OrderStatusChanged',
  'PaymentAnomaly',
  'AvailabilityChanged',
  'Notification',
] as const satisfies readonly RealtimeEventName[];

/** Événements des commandes, reçus par les appareils du restaurant (Managers). */
export const ORDER_EVENT_NAMES = [
  'OrderCreated',
  'OrderStatusChanged',
] as const satisfies readonly RealtimeEventName[];

/**
 * `idle` : pas encore demandée ; `offline` : le navigateur n'a plus de réseau.
 * `connecting` / `reconnecting` : nouvel essai automatique en cours.
 */
export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';
