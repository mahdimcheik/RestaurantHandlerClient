import { InjectionToken } from '@angular/core';

export const HUB_PATH = '/hubs/realtime';

/** Ce que `RealtimeService` utilise d'une `HubConnection` SignalR (remplaçable en test). */
export interface RealtimeConnection {
  start(): Promise<void>;
  stop(): Promise<void>;
  on(event: string, handler: (payload: unknown) => void): void;
  onreconnecting(callback: () => void): void;
  onreconnected(callback: () => void): void;
  onclose(callback: () => void): void;
}

export type HubConnectionFactory = (
  accessToken: () => Promise<string>,
) => Promise<RealtimeConnection>;

/** Reconnexion automatique sans fin : 0, 2, 5, 10 s puis toutes les 30 s. */
export const RECONNECT_DELAYS_MS = [0, 2_000, 5_000, 10_000];
export const RECONNECT_MAX_DELAY_MS = 30_000;

export function reconnectDelay(attempt: number): number {
  return RECONNECT_DELAYS_MS[attempt] ?? RECONNECT_MAX_DELAY_MS;
}

/** SignalR n'est chargé qu'à la première connexion, hors du bundle initial. */
async function createHubConnection(
  accessToken: () => Promise<string>,
): Promise<RealtimeConnection> {
  const signalR = await import('@microsoft/signalr');
  return new signalR.HubConnectionBuilder()
    .withUrl(HUB_PATH, { accessTokenFactory: accessToken })
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: ({ previousRetryCount }) => reconnectDelay(previousRetryCount),
    })
    .configureLogging(signalR.LogLevel.None)
    .build();
}

export const HUB_CONNECTION_FACTORY = new InjectionToken<HubConnectionFactory>(
  'HUB_CONNECTION_FACTORY',
  { providedIn: 'root', factory: () => createHubConnection },
);
