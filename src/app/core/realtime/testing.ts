import { computed, Provider, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { HUB_CONNECTION_FACTORY, RealtimeConnection } from './hub-connection';
import { ConnectionState } from './realtime-events';
import { RealtimeService } from './realtime.service';

/** Connexion SignalR simulée : les tests déclenchent eux-mêmes les rappels. */
export class FakeConnection implements RealtimeConnection {
  readonly handlers = new Map<string, (payload: unknown) => void>();
  startResult: () => Promise<void> = () => Promise.resolve();
  starts = 0;
  stops = 0;
  token: (() => Promise<string>) | null = null;
  private reconnecting = () => {};
  private reconnected = () => {};
  private closed = () => {};

  start(): Promise<void> {
    this.starts++;
    return this.startResult();
  }

  stop(): Promise<void> {
    this.stops++;
    return Promise.resolve();
  }

  on(event: string, handler: (payload: unknown) => void): void {
    this.handlers.set(event, handler);
  }

  onreconnecting(callback: () => void): void {
    this.reconnecting = callback;
  }

  onreconnected(callback: () => void): void {
    this.reconnected = callback;
  }

  onclose(callback: () => void): void {
    this.closed = callback;
  }

  emit(event: string, payload: unknown): void {
    this.handlers.get(event)?.(payload);
  }

  dropAndRetry(): void {
    this.reconnecting();
  }

  recover(): void {
    this.reconnected();
  }

  close(): void {
    this.closed();
  }
}

/**
 * Fournit une fabrique qui enregistre chaque connexion créée dans `connections`,
 * après l'avoir passée à `prepare` (ex. faire échouer son `start()`).
 */
export function provideFakeHub(
  connections: FakeConnection[] = [],
  prepare: (connection: FakeConnection) => void = () => {},
): Provider {
  return {
    provide: HUB_CONNECTION_FACTORY,
    useValue: async (token: () => Promise<string>) => {
      const connection = new FakeConnection();
      connection.token = token;
      prepare(connection);
      connections.push(connection);
      return connection;
    },
  };
}

/**
 * Temps réel simulé : `emit` pousse un événement, `resync` une resynchronisation, `state` fixe
 * l'état de la connexion.
 */
export function fakeRealtime() {
  const events = new Map<string, Subject<unknown>>();
  const resync = new Subject<void>();
  const state = signal<ConnectionState>('connected');
  const subject = (name: string) => {
    if (!events.has(name)) {
      events.set(name, new Subject());
    }
    return events.get(name)!;
  };
  return {
    provider: {
      provide: RealtimeService,
      useValue: {
        on: (name: string) => subject(name),
        resync,
        start: () => {},
        state,
        connected: computed(() => state() === 'connected'),
      },
    },
    emit: (name: string, payload: unknown) => subject(name).next(payload),
    resync,
    state,
  };
}
