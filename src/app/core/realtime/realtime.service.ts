import {
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  inject,
  Service,
  signal,
  untracked,
} from '@angular/core';
import { filter, firstValueFrom, map, Observable, Subject } from 'rxjs';
import { SessionService } from '../auth/session.service';
import { HUB_CONNECTION_FACTORY, RealtimeConnection, reconnectDelay } from './hub-connection';
import {
  ConnectionState,
  REALTIME_EVENT_NAMES,
  RealtimeEventName,
  RealtimeEvents,
} from './realtime-events';

/** Jeton renouvelé avant la connexion s'il expire dans moins de 30 s. */
const TOKEN_MARGIN_MS = 30_000;
/** Absence au-delà de laquelle un retour au premier plan relit l'état (veille iOS, R6). */
const HIDDEN_RESYNC_MS = 5_000;

type Status = Exclude<ConnectionState, 'offline'>;

interface Received {
  name: RealtimeEventName;
  payload: unknown;
}

/** Échéance du JWT (champ `exp`), lue sans vérification : sert seulement à le renouveler à temps. */
export function tokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload)) as { exp?: unknown };
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Connexion SignalR unique de l'application (`/hubs/realtime`).
 * Le hub ne fait que pousser : toute action passe par l'API REST, et chaque (re)connexion ou
 * retour au premier plan émet `resync` pour que les écrans relisent leur état depuis l'API.
 * Les groupes sont attribués par le serveur à la connexion : elle est rouverte quand
 * l'utilisateur change (connexion, déconnexion).
 */
@Service()
export class RealtimeService {
  private readonly session = inject(SessionService);
  private readonly createConnection = inject(HUB_CONNECTION_FACTORY);
  private readonly document = inject(DOCUMENT);

  private readonly received = new Subject<Received>();
  private readonly resyncs = new Subject<void>();
  private readonly status = signal<Status>('idle');
  private readonly networkOnline = signal(this.document.defaultView?.navigator.onLine ?? true);

  private wanted = false;
  /** Invalide les rappels d'une connexion abandonnée (arrêt ou changement d'utilisateur). */
  private generation = 0;
  private connection: RealtimeConnection | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private retry: (() => void) | null = null;
  private identity: string | null = null;
  private hiddenAt: number | null = null;

  readonly state = computed<ConnectionState>(() => {
    const status = this.status();
    return status !== 'idle' && !this.networkOnline() ? 'offline' : status;
  });
  readonly connected = computed(() => this.state() === 'connected');

  /** Après chaque (re)connexion et chaque retour au premier plan : relire l'état depuis l'API. */
  readonly resync: Observable<void> = this.resyncs.asObservable();

  constructor() {
    effect(() => {
      const identity = this.session.user()?.id ?? null;
      untracked(() => this.identityChanged(identity));
    });
    this.listenToEnvironment();
  }

  /** Ouvre la connexion si ce n'est déjà fait ; les essais se répètent jusqu'au succès. */
  start(): void {
    if (this.wanted) {
      return;
    }
    this.wanted = true;
    this.identity = this.session.user()?.id ?? null;
    void this.open();
  }

  stop(): void {
    this.wanted = false;
    this.close();
    this.status.set('idle');
  }

  /** Événement du hub ; s'abonner n'ouvre pas la connexion. */
  on<K extends RealtimeEventName>(name: K): Observable<RealtimeEvents[K]> {
    return this.received.pipe(
      filter((event) => event.name === name),
      map((event) => event.payload as RealtimeEvents[K]),
    );
  }

  private async open(): Promise<void> {
    const generation = ++this.generation;
    this.status.set('connecting');
    let connection: RealtimeConnection;
    try {
      connection = await this.createConnection(() => this.accessToken());
    } catch {
      // Module SignalR introuvable (déploiement remplacé) : nouvel essai plus tard.
      this.schedule(generation, 0, () => void this.open());
      return;
    }
    if (generation !== this.generation) {
      return;
    }
    this.connection = connection;
    const current = () => generation === this.generation;

    for (const name of REALTIME_EVENT_NAMES) {
      connection.on(name, (payload) => current() && this.received.next({ name, payload }));
    }
    connection.onreconnecting(() => current() && this.status.set('reconnecting'));
    connection.onreconnected(() => current() && this.connectedNow());
    connection.onclose(() => {
      // Fermée sans qu'on l'ait demandé (reconnexion abandonnée) : on recommence.
      if (current()) {
        this.status.set('reconnecting');
        void this.connect(connection, generation, 0);
      }
    });
    await this.connect(connection, generation, 0);
  }

  private async connect(
    connection: RealtimeConnection,
    generation: number,
    attempt: number,
  ): Promise<void> {
    try {
      await connection.start();
    } catch {
      this.schedule(
        generation,
        attempt,
        () => void this.connect(connection, generation, attempt + 1),
      );
      return;
    }
    if (generation === this.generation) {
      this.connectedNow();
    }
  }

  private connectedNow(): void {
    this.status.set('connected');
    this.resyncs.next();
  }

  /** Nouvel essai différé ; `retryNow()` l'avance (réseau revenu, onglet de nouveau visible). */
  private schedule(generation: number, attempt: number, run: () => void): void {
    if (generation !== this.generation) {
      return;
    }
    this.cancelRetry();
    const fire = () => {
      this.cancelRetry();
      if (generation === this.generation) {
        run();
      }
    };
    this.retry = fire;
    this.retryTimer = setTimeout(fire, reconnectDelay(attempt + 1));
  }

  private retryNow(): void {
    this.retry?.();
  }

  private cancelRetry(): void {
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    this.retry = null;
  }

  private close(): void {
    this.generation++;
    this.cancelRetry();
    const connection = this.connection;
    this.connection = null;
    void connection?.stop().catch(() => undefined);
  }

  private identityChanged(identity: string | null): void {
    if (identity === this.identity) {
      return;
    }
    this.identity = identity;
    if (this.wanted) {
      this.close();
      void this.open();
    }
  }

  private async accessToken(): Promise<string> {
    const token = this.session.accessToken();
    if (!token) {
      return '';
    }
    const expiry = tokenExpiry(token);
    if (expiry !== null && expiry - Date.now() < TOKEN_MARGIN_MS) {
      try {
        return await firstValueFrom(this.session.refresh());
      } catch {
        return '';
      }
    }
    return token;
  }

  private listenToEnvironment(): void {
    const window = this.document.defaultView;
    if (!window) {
      return;
    }
    const online = () => {
      this.networkOnline.set(true);
      this.retryNow();
    };
    const offline = () => this.networkOnline.set(false);
    const visibility = () => {
      if (this.document.visibilityState === 'hidden') {
        this.hiddenAt = Date.now();
        return;
      }
      const hiddenFor = this.hiddenAt === null ? 0 : Date.now() - this.hiddenAt;
      this.hiddenAt = null;
      if (this.wanted && hiddenFor >= HIDDEN_RESYNC_MS) {
        this.retryNow();
        this.resyncs.next();
      }
    };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    this.document.addEventListener('visibilitychange', visibility);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      this.document.removeEventListener('visibilitychange', visibility);
      this.stop();
    });
  }
}
