import { computed, effect, inject, Service, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationDetails } from '../../core/api/generated';
import { SessionService } from '../../core/auth/session.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { NotificationsService } from './notifications.service';

/** Notification affichée quelques secondes en surimpression. */
export interface Toast {
  id: string;
  message: string;
  link: string | null;
  /** Commande prête : mise en avant (US-E08-1). */
  ready: boolean;
}

/** Durée d'affichage d'un toast ; la notification reste ensuite dans la cloche. */
export const TOAST_DURATION_MS = 8000;
const LATEST_COUNT = 10;

/**
 * Notifications du client connecté (US-E08-2) : les dernières et le nombre de non-lues pour la
 * cloche de la barre du haut, et un toast à chaque notification poussée par le serveur. Rien sans
 * session client ; relues à chaque resynchronisation (téléphone déverrouillé, réseau retrouvé).
 */
@Service()
export class NotificationCenter {
  private readonly session = inject(SessionService);
  private readonly notifications = inject(NotificationsService);
  private readonly realtime = inject(RealtimeService);

  private readonly customerId = computed(() =>
    this.session.isManager() ? undefined : this.session.user()?.id,
  );
  private readonly resource = rxResource({
    params: () => this.customerId(),
    stream: () => this.notifications.list({ first: 0, row: LATEST_COUNT }),
  });
  private readonly page = computed(() =>
    this.customerId() && this.resource.hasValue() ? this.resource.value() : undefined,
  );

  /** Vrai seulement pour un client connecté : la cloche n'existe pas sinon. */
  readonly enabled = computed(() => !!this.customerId());
  /** Dernières notifications, la plus récente en premier. */
  readonly items = computed<NotificationDetails[]>(() => this.page()?.items ?? []);
  /** Non-lues au total (le serveur compte toujours les non-lues). */
  readonly unread = computed(() => this.page()?.count ?? 0);
  readonly toasts = signal<Toast[]>([]);

  constructor() {
    effect(() => {
      if (this.customerId()) {
        this.realtime.start();
      } else {
        this.toasts.set([]);
      }
    });
    this.realtime
      .on('Notification')
      .pipe(takeUntilDestroyed())
      .subscribe((notification) => {
        if (!this.customerId()) {
          return;
        }
        this.show({
          id: notification.id,
          message: notification.message,
          link: notification.link ?? null,
          ready: notification.icon === 'bell',
        });
        this.resource.reload();
      });
    this.realtime.resync.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.customerId()) {
        this.resource.reload();
      }
    });
  }

  dismiss(id: string): void {
    this.toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  /** Marque comme lue une notification ouverte (cloche ou toast). */
  markSeen(id: string): void {
    const item = this.items().find((notification) => notification.id === id);
    if (item?.isSeen) {
      return;
    }
    this.notifications.toggleSeen(id).subscribe({
      next: () => this.resource.reload(),
      error: () => this.resource.reload(),
    });
  }

  markAllSeen(): void {
    this.notifications.toggleAllSeen().subscribe({
      next: () => this.resource.reload(),
      error: () => this.resource.reload(),
    });
  }

  private show(toast: Toast): void {
    this.toasts.update((toasts) => [...toasts.filter((t) => t.id !== toast.id), toast]);
    if (toast.ready) {
      navigator.vibrate?.([200, 100, 200]);
    }
    setTimeout(() => this.dismiss(toast.id), TOAST_DURATION_MS);
  }
}
