import { computed, inject, InjectionToken, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { soundSetting, webAudioChime } from '../utils/chime';
import { ManageOrdersService } from './manage-orders.service';

const MUTE_KEY = 'rh.approval-sound';

/** Son joué à l'arrivée d'une commande à valider. */
export const APPROVAL_SOUND = new InjectionToken<() => void>('APPROVAL_SOUND', {
  providedIn: 'root',
  factory: webAudioChime,
});

/**
 * Commandes « à payer au retrait » en attente de validation (US-E06-3) : leur nombre pour le
 * badge du back-office, relu à chaque événement de commande et après une coupure, et un son à
 * chaque nouvelle arrivée (coupable, réglage propre à l'appareil). Rien avant `start()`.
 */
@Service()
export class ApprovalAlertService {
  private readonly orders = inject(ManageOrdersService);
  private readonly realtime = inject(RealtimeService);
  private readonly sound = inject(APPROVAL_SOUND);

  private readonly started = signal(false);
  private readonly resource = rxResource({
    params: () => (this.started() ? true : undefined),
    stream: () => this.orders.list({ Status: 'AwaitingApproval' }),
  });

  /** Nombre de commandes à valider (0 tant qu'il n'est pas connu). */
  readonly count = computed(() =>
    this.resource.hasValue() ? this.resource.value().items.length : 0,
  );
  /** Identifiants des commandes à valider, par heure de retrait (`undefined` tant qu'inconnus). */
  readonly ids = computed(() =>
    this.resource.hasValue()
      ? [...this.resource.value().items]
          .sort((a, b) => Date.parse(a.pickupAt) - Date.parse(b.pickupAt))
          .map((order) => order.id)
      : undefined,
  );
  private readonly setting = soundSetting(MUTE_KEY);
  readonly muted = this.setting.muted;

  constructor() {
    merge(
      this.realtime.on('OrderAwaitingApproval'),
      this.realtime.on('OrderStatusChanged'),
      this.realtime.on('OrderCreated'),
      this.realtime.resync,
    ).subscribe(() => this.reload());
    this.realtime.on('OrderAwaitingApproval').subscribe(() => {
      if (this.started() && !this.muted()) {
        this.sound();
      }
    });
  }

  start(): void {
    this.started.set(true);
  }

  reload(): void {
    if (this.started()) {
      this.resource.reload();
    }
  }

  toggleMuted(): void {
    this.setting.toggle();
  }
}
