import { HttpErrorResponse } from '@angular/common/http';
import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  InjectionToken,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge, Observable } from 'rxjs';
import { OrderDetails, OrderStatus } from '../../../core/api/generated';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ORDER_EVENT_NAMES } from '../../../core/realtime/realtime-events';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { ManageOrdersService } from '../../../shared/services/manage-orders.service';
import { soundSetting, webAudioChime } from '../../../shared/utils/chime';
import { newcomers, splitColumns } from '../kitchen-format';

/** Annulation proposée un peu moins longtemps que les 10 s du serveur (latence du réseau). */
export const UNDO_WINDOW_MS = 9_000;
/** Relecture périodique : une commande programmée entre dans la file sans aucun événement. */
export const REFRESH_MS = 60_000;

/** Son joué à l'arrivée d'une commande dans la file de la cuisine. */
export const KITCHEN_SOUND = new InjectionToken<() => void>('KITCHEN_SOUND', {
  providedIn: 'root',
  factory: webAudioChime,
});

const SOUND_KEY = 'rh.kitchen-sound';

const OFFLINE = `Pas de réseau : le geste n'a pas été enregistré. Réessayez quand la connexion revient.`;
const CHANGED = 'La commande a changé sur un autre écran : la file a été rechargée.';

/** Dernier geste, annulable jusqu'à `deadline` (ms). */
export interface LastGesture {
  id: string;
  dailyNumber: number;
  status: OrderStatus;
  deadline: number;
}

/**
 * État de l'écran cuisine (US-E07-1 à 3) : file relue depuis l'API à chaque événement de
 * commande, à chaque `resync` et chaque minute ; gestes sans mise à jour optimiste ; dernier
 * geste annulable ; son à l'arrivée d'une commande. Fourni par la page.
 */
@Injectable()
export class KitchenBoard {
  private readonly orders = inject(ManageOrdersService);
  private readonly sound = inject(KITCHEN_SOUND);
  private readonly setting = soundSetting(SOUND_KEY);

  private readonly queue = rxResource({ stream: () => this.orders.kitchen() });
  /** Dernière file connue : une relecture en échec n'efface pas l'écran. */
  private readonly list = linkedSignal<OrderDetails[] | undefined, OrderDetails[]>({
    source: () => (this.queue.hasValue() ? this.queue.value() : undefined),
    computation: (value, previous) => value ?? previous?.value ?? [],
  });
  private readonly now = signal(Date.now());

  readonly muted = this.setting.muted;
  readonly loading = computed(() => this.queue.status() === 'loading');
  readonly loadError = computed(() =>
    this.queue.error() ? apiErrorMessage(this.queue.error()) : '',
  );
  readonly columns = computed(() => splitColumns(this.list()));
  /** Commande dont un geste est en cours d'envoi. */
  readonly pending = signal<string | null>(null);
  /** Échec d'un geste, toujours affiché : jamais perdu en silence. */
  readonly message = signal('');
  /** Annonce aux lecteurs d'écran des nouvelles commandes. */
  readonly notice = signal('');
  readonly lastGesture = signal<LastGesture | null>(null);
  readonly remaining = computed(() => {
    const gesture = this.lastGesture();
    return gesture ? Math.max(0, Math.ceil((gesture.deadline - this.now()) / 1000)) : 0;
  });

  constructor() {
    const realtime = inject(RealtimeService);
    merge(...ORDER_EVENT_NAMES.map((name) => realtime.on(name)), realtime.resync)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.queue.reload());

    const refresh = setInterval(() => this.queue.reload(), REFRESH_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(refresh));

    let seen: Set<string> | null = null;
    effect(() => {
      if (!this.queue.hasValue()) {
        return;
      }
      const current = this.queue.value();
      untracked(() => {
        const arrived = seen ? newcomers(seen, current) : [];
        seen = new Set([...(seen ?? []), ...current.map((order) => order.id)]);
        if (arrived.length > 0) {
          this.announce(arrived);
        }
      });
    });

    effect((onCleanup) => {
      const gesture = this.lastGesture();
      if (!gesture) {
        return;
      }
      this.now.set(Date.now());
      const timer = setInterval(() => {
        const now = Date.now();
        this.now.set(now);
        if (now >= gesture.deadline) {
          this.lastGesture.set(null);
        }
      }, 250);
      onCleanup(() => clearInterval(timer));
    });
  }

  /** `Confirmée → En préparation` ou `En préparation → Prête`, d'une touche. */
  advance(order: OrderDetails): void {
    const call =
      order.status === 'Confirmed' ? this.orders.start(order.id) : this.orders.markReady(order.id);
    this.send(order.id, call, (updated) =>
      this.lastGesture.set({
        id: updated.id,
        dailyNumber: updated.dailyNumber,
        status: updated.status,
        deadline: Date.now() + UNDO_WINDOW_MS,
      }),
    );
  }

  /** Revient sur le dernier geste (erreur de doigt) ; le serveur refuse après 10 s. */
  undo(): void {
    const gesture = this.lastGesture();
    if (!gesture) {
      return;
    }
    this.lastGesture.set(null);
    this.send(gesture.id, this.orders.undo(gesture.id), () => undefined, true);
  }

  toggleSound(): void {
    this.setting.toggle();
  }

  private send(
    id: string,
    call: Observable<OrderDetails>,
    done: (order: OrderDetails) => void,
    serverMessage = false,
  ): void {
    if (this.pending()) {
      return;
    }
    this.pending.set(id);
    this.message.set('');
    call.subscribe({
      next: (order) => {
        this.pending.set(null);
        done(order);
        this.queue.reload();
      },
      error: (error: unknown) => {
        this.pending.set(null);
        this.message.set(gestureError(error, serverMessage));
        this.queue.reload();
      },
    });
  }

  private announce(arrived: OrderDetails[]): void {
    const numbers = arrived.map((order) => order.dailyNumber).join(', ');
    this.notice.set(`Nouvelle commande n° ${numbers}`);
    if (!this.muted()) {
      this.sound();
    }
  }
}

function gestureError(error: unknown, serverMessage: boolean): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return OFFLINE;
    }
    if (error.status === 409 && !serverMessage) {
      return CHANGED;
    }
  }
  return apiErrorMessage(error);
}
