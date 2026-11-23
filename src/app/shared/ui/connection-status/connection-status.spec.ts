import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConnectionState } from '../../../core/realtime/realtime-events';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { ConnectionBanner, ConnectionStatus, CONNECTION_LOST_DELAY_MS } from './connection-status';

describe('ConnectionStatus et ConnectionBanner', () => {
  let state: ReturnType<typeof signal<ConnectionState>>;

  beforeEach(() => {
    vi.useFakeTimers();
    state = signal<ConnectionState>('connecting');
    TestBed.configureTestingModule({
      providers: [{ provide: RealtimeService, useValue: { state } }],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('affiche un libellé pour chaque état, en zone de statut', async () => {
    const fixture = TestBed.createComponent(ConnectionStatus);
    const root = fixture.nativeElement as HTMLElement;
    const labels: Partial<Record<ConnectionState, string>> = {
      connecting: 'Connexion…',
      connected: 'Temps réel connecté',
      reconnecting: 'Reconnexion…',
      offline: 'Hors ligne',
    };
    for (const [value, label] of Object.entries(labels)) {
      state.set(value as ConnectionState);
      TestBed.tick();
      expect(root.querySelector('[role="status"]')?.textContent?.trim()).toBe(label);
    }
    expect(root.classList).not.toContain('connection-status--up');
    state.set('connected');
    TestBed.tick();
    expect(root.classList).toContain('connection-status--up');
  });

  it('n’annonce la perte qu’après le délai, et la retire à la reconnexion', async () => {
    const fixture = TestBed.createComponent(ConnectionBanner);
    const root = fixture.nativeElement as HTMLElement;
    state.set('reconnecting');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(CONNECTION_LOST_DELAY_MS - 1_000);
    TestBed.tick();
    expect(root.querySelector('[role="alert"]')).toBeNull();

    await vi.advanceTimersByTimeAsync(1_000);
    TestBed.tick();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Connexion perdue');

    state.set('connected');
    TestBed.tick();
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('une coupure éclair ne déclenche pas de bandeau', async () => {
    const fixture = TestBed.createComponent(ConnectionBanner);
    const root = fixture.nativeElement as HTMLElement;
    state.set('reconnecting');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(2_000);
    state.set('connected');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(CONNECTION_LOST_DELAY_MS);
    TestBed.tick();
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });
});
