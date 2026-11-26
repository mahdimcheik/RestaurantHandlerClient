import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SessionService } from '../../core/auth/session.service';
import { fakeRealtime } from '../../core/realtime/testing';
import { NotificationCenter, TOAST_DURATION_MS } from './notification-center.service';

const page = (count: number, items: object[] = []) => ({
  data: items,
  count,
  message: 'OK',
  status: 200,
});

const pushed = (extra: object = {}) => ({
  id: 'n1',
  type: 'Order',
  message: 'Commande n° 42 en préparation.',
  link: '/commandes/o1',
  icon: 'orders',
  ...extra,
});

describe('NotificationCenter', () => {
  afterEach(() => vi.useRealTimers());

  const setup = (manager: boolean) => {
    const realtime = fakeRealtime();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        realtime.provider,
        {
          provide: SessionService,
          useValue: { user: signal({ id: 'u1' }), isManager: signal(manager) },
        },
      ],
    });
    const center = TestBed.inject(NotificationCenter);
    return { center, realtime, http: TestBed.inject(HttpTestingController) };
  };
  const settle = async () => {
    TestBed.tick();
    if (vi.isFakeTimers()) {
      await vi.advanceTimersByTimeAsync(0);
    } else {
      await new Promise((resolve) => setTimeout(resolve));
    }
    TestBed.tick();
  };

  it('charge les dernières notifications et le nombre de non-lues', async () => {
    const { center, http } = setup(false);
    await settle();
    const request = http.expectOne('/notifications');
    expect(request.request.body).toEqual({ first: 0, row: 10 });
    request.flush(page(2, [{ id: 'n1', message: 'Prête', isSeen: false }]));
    await settle();
    expect(center.enabled()).toBe(true);
    expect(center.unread()).toBe(2);
    expect(center.items().map((n) => n.id)).toEqual(['n1']);
    http.verify();
  });

  it('affiche un toast à chaque notification poussée, puis le retire seul', async () => {
    vi.useFakeTimers();
    const { center, realtime, http } = setup(false);
    await settle();
    http.expectOne('/notifications').flush(page(0));
    await settle();

    realtime.emit('Notification', pushed());
    await settle();
    expect(center.toasts()).toEqual([
      { id: 'n1', message: 'Commande n° 42 en préparation.', link: '/commandes/o1', ready: false },
    ]);
    http.expectOne('/notifications').flush(page(1));
    await settle();

    realtime.emit('Notification', pushed({ id: 'n2', icon: 'bell' }));
    expect(center.toasts()[1].ready).toBe(true);
    await settle();
    http.expectOne('/notifications').flush(page(2));

    await vi.advanceTimersByTimeAsync(TOAST_DURATION_MS);
    expect(center.toasts()).toEqual([]);
  });

  it('marque tout comme lu puis relit', async () => {
    const { center, http } = setup(false);
    await settle();
    http.expectOne('/notifications').flush(page(3));
    await settle();
    center.markAllSeen();
    http.expectOne('/notifications/all-toggle-seen').flush({ message: 'Ok', status: 200 });
    await settle();
    http.expectOne('/notifications').flush(page(0));
    await settle();
    expect(center.unread()).toBe(0);
  });

  it('ne demande rien et ignore les événements pour un Manager', async () => {
    const { center, realtime, http } = setup(true);
    await settle();
    realtime.emit('Notification', pushed());
    http.expectNone('/notifications');
    expect(center.enabled()).toBe(false);
    expect(center.toasts()).toEqual([]);
  });
});
