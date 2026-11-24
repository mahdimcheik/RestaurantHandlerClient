import { Component, computed, effect, inject, signal } from '@angular/core';
import { ConnectionState } from '../../../core/realtime/realtime-events';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { Icon, IconName } from '../icon/icon';

/** Délai avant d'annoncer la perte : une reconnexion éclair ne doit pas faire clignoter l'écran. */
export const CONNECTION_LOST_DELAY_MS = 5_000;

const LABELS: Record<ConnectionState, string> = {
  idle: 'Temps réel inactif',
  connecting: 'Connexion…',
  connected: 'Temps réel connecté',
  reconnecting: 'Reconnexion…',
  offline: 'Hors ligne',
};

const ICONS: Record<ConnectionState, IconName> = {
  idle: 'offline',
  connecting: 'clock',
  connected: 'online',
  reconnecting: 'clock',
  offline: 'offline',
};

/** Vrai quand la connexion manque depuis plus de `CONNECTION_LOST_DELAY_MS`. */
export function connectionLost(): () => boolean {
  const realtime = inject(RealtimeService);
  const lost = signal(false);
  effect((onCleanup) => {
    const state = realtime.state();
    if (state === 'connected' || state === 'idle') {
      lost.set(false);
      return;
    }
    const timer = setTimeout(() => lost.set(true), CONNECTION_LOST_DELAY_MS);
    onCleanup(() => clearTimeout(timer));
  });
  return lost.asReadonly();
}

/** État de la connexion temps réel, toujours visible : icône, libellé et couleur. */
@Component({
  selector: 'app-connection-status',
  imports: [Icon],
  host: {
    class: 'connection-status',
    '[class.connection-status--up]': "state() === 'connected'",
    '[class.connection-status--down]': 'lost()',
  },
  template: `
    <p class="connection-status__state" role="status">
      <app-icon [name]="icon()" />
      <span>{{ label() }}</span>
    </p>
  `,
})
export class ConnectionStatus {
  protected readonly state = inject(RealtimeService).state;
  protected readonly lost = connectionLost();
  protected readonly label = computed(() => LABELS[this.state()]);
  protected readonly icon = computed(() => ICONS[this.state()]);
}

/** Bandeau d'alerte quand la connexion manque depuis plus de quelques secondes (US-E07-3). */
@Component({
  selector: 'app-connection-banner',
  template: `
    @if (lost()) {
      <p class="alert alert--error" role="alert">
        Connexion perdue : les informations affichées peuvent ne plus être à jour. Reconnexion
        automatique en cours…
      </p>
    }
  `,
})
export class ConnectionBanner {
  protected readonly lost = connectionLost();
}
