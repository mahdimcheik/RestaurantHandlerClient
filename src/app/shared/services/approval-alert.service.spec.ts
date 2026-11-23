import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { envelope } from '../testing';
import { APPROVAL_SOUND, ApprovalAlertService } from './approval-alert.service';

describe('ApprovalAlertService', () => {
  let alert: ApprovalAlertService;
  let http: HttpTestingController;
  let events: Map<string, Subject<unknown>>;
  let resync: Subject<void>;
  let sound: ReturnType<typeof vi.fn>;

  const emit = (name: string) => events.get(name)!.next({});
  const settle = () => TestBed.inject(ApplicationRef).whenStable();
  const answer = async (count: number) => {
    TestBed.tick();
    const request = http.expectOne((r) => r.url === '/manage/orders');
    expect(request.request.params.get('Status')).toBe('AwaitingApproval');
    request.flush(envelope(Array.from({ length: count }, (_, i) => ({ id: `o${i}` }))));
    await settle();
  };

  beforeEach(() => {
    localStorage.clear();
    events = new Map();
    resync = new Subject();
    sound = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APPROVAL_SOUND, useValue: sound },
        {
          provide: RealtimeService,
          useValue: {
            on: (name: string) => {
              if (!events.has(name)) {
                events.set(name, new Subject());
              }
              return events.get(name)!;
            },
            resync,
          },
        },
      ],
    });
    alert = TestBed.inject(ApprovalAlertService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('ne demande rien avant start(), puis compte les commandes à valider', async () => {
    TestBed.tick();
    http.expectNone('/manage/orders');
    expect(alert.count()).toBe(0);

    alert.start();
    TestBed.tick();
    await answer(2);
    expect(alert.count()).toBe(2);
  });

  it('relit le compte à chaque événement de commande et après une coupure', async () => {
    alert.start();
    TestBed.tick();
    await answer(0);

    emit('OrderAwaitingApproval');
    TestBed.tick();
    await answer(1);
    expect(alert.count()).toBe(1);

    resync.next();
    TestBed.tick();
    await answer(0);
    expect(alert.count()).toBe(0);
  });

  it('sonne à l’arrivée d’une commande à valider, sauf si le son est coupé', async () => {
    alert.start();
    TestBed.tick();
    await answer(0);

    emit('OrderAwaitingApproval');
    TestBed.tick();
    await answer(1);
    expect(sound).toHaveBeenCalledTimes(1);

    emit('OrderStatusChanged');
    TestBed.tick();
    await answer(1);
    expect(sound).toHaveBeenCalledTimes(1);

    alert.toggleMuted();
    expect(localStorage.getItem('rh.approval-sound')).toBe('off');
    emit('OrderAwaitingApproval');
    TestBed.tick();
    await answer(2);
    expect(sound).toHaveBeenCalledTimes(1);
  });
});
