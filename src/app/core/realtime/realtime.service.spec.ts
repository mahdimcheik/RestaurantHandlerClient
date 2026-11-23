import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SessionService } from '../auth/session.service';
import { RealtimeService, tokenExpiry } from './realtime.service';
import { FakeConnection, provideFakeHub } from './testing';

/** JWT non signé dont seul `exp` compte ici. */
const jwt = (expSeconds: number) =>
  `h.${btoa(JSON.stringify({ exp: expSeconds })).replace(/=+$/, '')}.s`;

describe('RealtimeService', () => {
  let connections: FakeConnection[];
  let user: ReturnType<typeof signal<{ id: string } | null>>;
  let token: string | null;
  let refresh: ReturnType<typeof vi.fn>;
  let realtime: RealtimeService;
  let visibility: DocumentVisibilityState;
  let prepare: (connection: FakeConnection) => void;

  const flush = () => vi.advanceTimersByTimeAsync(0);

  beforeEach(() => {
    vi.useFakeTimers();
    connections = [];
    user = signal<{ id: string } | null>({ id: 'u1' });
    token = 'jwt-1';
    refresh = vi.fn(() => of('jwt-2'));
    visibility = 'visible';
    prepare = () => {};
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });
    TestBed.configureTestingModule({
      providers: [
        provideFakeHub(connections, (connection) => prepare(connection)),
        {
          provide: SessionService,
          useValue: { user, accessToken: () => token, refresh },
        },
      ],
    });
    realtime = TestBed.inject(RealtimeService);
    TestBed.tick();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (document as { visibilityState?: unknown }).visibilityState;
  });

  async function started(): Promise<FakeConnection> {
    realtime.start();
    await flush();
    return connections.at(-1)!;
  }

  it('ne se connecte pas avant start()', async () => {
    await flush();
    expect(connections).toHaveLength(0);
    expect(realtime.state()).toBe('idle');
  });

  it('se connecte puis demande une relecture', async () => {
    const resyncs = vi.fn();
    realtime.resync.subscribe(resyncs);
    const connection = await started();
    expect(connection.starts).toBe(1);
    expect(realtime.state()).toBe('connected');
    expect(resyncs).toHaveBeenCalledTimes(1);
  });

  it('start() répété ne rouvre pas de connexion', async () => {
    await started();
    realtime.start();
    await flush();
    expect(connections).toHaveLength(1);
  });

  it('transmet chaque événement à ses seuls abonnés', async () => {
    const created = vi.fn();
    const updated = vi.fn();
    realtime.on('OrderCreated').subscribe(created);
    realtime.on('OrderUpdated').subscribe(updated);
    const connection = await started();
    connection.emit('OrderCreated', { id: 'o1' });
    expect(created).toHaveBeenCalledWith({ id: 'o1' });
    expect(updated).not.toHaveBeenCalled();
  });

  it('suit la reconnexion automatique et relit à son terme', async () => {
    const resyncs = vi.fn();
    realtime.resync.subscribe(resyncs);
    const connection = await started();
    connection.dropAndRetry();
    expect(realtime.state()).toBe('reconnecting');
    connection.recover();
    expect(realtime.state()).toBe('connected');
    expect(resyncs).toHaveBeenCalledTimes(2);
  });

  it('réessaie la première connexion jusqu’au succès', async () => {
    let fail = true;
    realtime.start();
    await flush();
    const connection = connections[0];
    connection.startResult = () => (fail ? Promise.reject(new Error('down')) : Promise.resolve());
    // Le premier start() a déjà réussi avec le résultat par défaut : simuler une fermeture.
    connection.close();
    await flush();
    expect(realtime.state()).toBe('reconnecting');
    expect(connection.starts).toBe(2);
    fail = false;
    await vi.advanceTimersByTimeAsync(2_000);
    expect(connection.starts).toBe(3);
    expect(realtime.state()).toBe('connected');
  });

  it('réessaie quand la toute première connexion échoue', async () => {
    let fail = true;
    prepare = (connection) =>
      (connection.startResult = () =>
        fail ? Promise.reject(new Error('down')) : Promise.resolve());
    await started();
    expect(realtime.state()).toBe('connecting');
    fail = false;
    await vi.advanceTimersByTimeAsync(2_000);
    expect(connections[0].starts).toBe(2);
    expect(realtime.state()).toBe('connected');
  });

  it('signale aussitôt la perte du réseau', async () => {
    await started();
    window.dispatchEvent(new Event('offline'));
    expect(realtime.state()).toBe('offline');
    window.dispatchEvent(new Event('online'));
    expect(realtime.state()).toBe('connected');
  });

  it('rouvre la connexion quand l’utilisateur change', async () => {
    const first = await started();
    user.set(null);
    TestBed.tick();
    await flush();
    expect(first.stops).toBe(1);
    expect(connections).toHaveLength(2);
    expect(realtime.state()).toBe('connected');
  });

  it('ignore les événements d’une connexion abandonnée', async () => {
    const created = vi.fn();
    realtime.on('OrderCreated').subscribe(created);
    const first = await started();
    user.set({ id: 'u2' });
    TestBed.tick();
    await flush();
    first.emit('OrderCreated', { id: 'o1' });
    expect(created).not.toHaveBeenCalled();
  });

  it('relit au retour au premier plan après une absence', async () => {
    const resyncs = vi.fn();
    await started();
    realtime.resync.subscribe(resyncs);

    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(1_000);
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(resyncs).not.toHaveBeenCalled();

    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(10_000);
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(resyncs).toHaveBeenCalledTimes(1);
  });

  it('passe le jeton, renouvelé s’il expire bientôt', async () => {
    const connection = await started();
    token = jwt(Date.now() / 1000 + 3600);
    await expect(connection.token!()).resolves.toBe(token);
    expect(refresh).not.toHaveBeenCalled();

    token = jwt(Date.now() / 1000 + 10);
    await expect(connection.token!()).resolves.toBe('jwt-2');
    expect(refresh).toHaveBeenCalledTimes(1);

    token = null;
    await expect(connection.token!()).resolves.toBe('');
  });

  it('stop() ferme la connexion', async () => {
    const connection = await started();
    realtime.stop();
    expect(connection.stops).toBe(1);
    expect(realtime.state()).toBe('idle');
  });
});

describe('tokenExpiry', () => {
  it('lit exp en millisecondes, null si illisible', () => {
    expect(tokenExpiry(jwt(100))).toBe(100_000);
    expect(tokenExpiry('pas-un-jwt')).toBeNull();
  });
});
