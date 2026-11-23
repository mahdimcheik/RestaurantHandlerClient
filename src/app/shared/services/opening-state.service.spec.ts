import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OpeningStateDto } from '../../core/api/generated';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { FakeConnection, provideFakeHub } from '../../core/realtime/testing';
import { nextBoundaryDelay, OpeningStateService } from './opening-state.service';

const envelope = <T>(data: T) => ({ data, message: 'OK', status: 200 });
const NOW = Date.parse('2026-11-23T12:00:00Z');

describe('nextBoundaryDelay', () => {
  const state = (patch: Partial<OpeningStateDto>) =>
    ({ status: 'Open', ...patch }) as OpeningStateDto;

  it('vise la bascule la plus proche, une seconde après', () => {
    expect(
      nextBoundaryDelay(
        state({ closesAt: '2026-11-23T14:00:00Z', pausedUntil: '2026-11-23T12:30:00Z' }),
        NOW,
      ),
    ).toBe(30 * 60_000 + 1_000);
  });

  it('sans échéance : aucun minuteur', () => {
    expect(nextBoundaryDelay(state({}), NOW)).toBeNull();
  });

  it('échéance dépassée : relit dans 5 s, pas en boucle serrée', () => {
    expect(nextBoundaryDelay(state({ closesAt: '2026-11-23T11:59:00Z' }), NOW)).toBe(5_000);
  });

  it('échéance lointaine : plafonnée', () => {
    expect(nextBoundaryDelay(state({ nextOpeningAt: '2027-01-15T12:00:00Z' }), NOW)).toBe(
      6 * 60 * 60_000,
    );
  });
});

describe('OpeningStateService', () => {
  let connections: FakeConnection[];
  let http: HttpTestingController;
  let opening: OpeningStateService;
  const settle = () => TestBed.inject(ApplicationRef).whenStable();
  /** Laisse passer les promesses en cours puis la détection (sans attendre les requêtes). */
  const tick = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
  };
  const open: OpeningStateDto = { status: 'Open' } as OpeningStateDto;

  beforeEach(() => {
    connections = [];
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideFakeHub(connections)],
    });
    http = TestBed.inject(HttpTestingController);
    opening = TestBed.inject(OpeningStateService);
  });

  afterEach(() => http.verify());

  it('relit l’état sur un changement d’ouverture poussé, pas sur un changement de carte', async () => {
    opening.load();
    TestBed.tick();
    http.expectOne('/restaurant/status').flush(envelope(open));
    await settle();

    const realtime = TestBed.inject(RealtimeService);
    realtime.start();
    await tick();
    http.expectOne('/restaurant/status').flush(envelope(open));
    await settle();

    connections[0].emit('AvailabilityChanged', { scope: 'catalog' });
    await tick();
    http.expectNone('/restaurant/status');

    connections[0].emit('AvailabilityChanged', { scope: 'opening' });
    await tick();
    http
      .expectOne('/restaurant/status')
      .flush(envelope({ ...open, status: 'Paused' } as OpeningStateDto));
    await settle();
    expect(opening.state()?.status).toBe('Paused');
    realtime.stop();
  });
});
