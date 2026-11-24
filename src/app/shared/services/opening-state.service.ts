import { computed, effect, inject, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { filter, merge } from 'rxjs';
import { OpeningStateDto } from '../../core/api/generated';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { PublicService } from './public.service';
import { splitMoment } from '../utils/restaurant-time';

/** Plafond du minuteur de relecture (au-delà, `setTimeout` déborde ; une relecture le réarme). */
const MAX_TIMER_MS = 6 * 60 * 60_000;
/** Échéance dépassée mais état inchangé (horloges décalées) : relire sans s'emballer. */
const PAST_BOUNDARY_RETRY_MS = 5_000;

/**
 * Délai avant la prochaine bascule due à l'horloge (fin de pause, fermeture, ouverture), que le
 * serveur ne pousse pas en temps réel ; `null` s'il n'y en a pas.
 */
export function nextBoundaryDelay(state: OpeningStateDto, now: number = Date.now()): number | null {
  const boundaries = [state.pausedUntil, state.closesAt, state.nextOpeningAt]
    .filter((moment): moment is string => !!moment)
    .map((moment) => new Date(moment).getTime())
    .filter((time) => !Number.isNaN(time));
  if (boundaries.length === 0) {
    return null;
  }
  const remaining = Math.min(...boundaries) - now;
  return remaining > 0 ? Math.min(remaining + 1_000, MAX_TIMER_MS) : PAST_BOUNDARY_RETRY_MS;
}

/** État d'ouverture en une phrase : « Fermé — ouvre lundi à 18:30 ». */
export function describeOpening(state: OpeningStateDto, now: Date = new Date()): string {
  switch (state.status) {
    case 'Open': {
      if (!state.closesAt) {
        return $localize`:@@opening.open:Ouvert`;
      }
      const { day, time } = splitMoment(state.closesAt, now);
      return day
        ? $localize`:@@opening.openUntilDay:Ouvert — ferme ${day}:day: à ${time}:time:`
        : $localize`:@@opening.openUntil:Ouvert — ferme à ${time}:time:`;
    }
    case 'Paused': {
      if (!state.pausedUntil) {
        return $localize`:@@opening.paused:Commandes en pause`;
      }
      const { day, time } = splitMoment(state.pausedUntil, now);
      return day
        ? $localize`:@@opening.pausedUntilDay:Commandes en pause jusqu'à ${day}:day: ${time}:time:`
        : $localize`:@@opening.pausedUntil:Commandes en pause jusqu'à ${time}:time:`;
    }
    default: {
      if (!state.nextOpeningAt) {
        return $localize`:@@opening.closed:Fermé`;
      }
      const { day, time } = splitMoment(state.nextOpeningAt, now);
      return day
        ? $localize`:@@opening.closedUntilDay:Fermé — ouvre ${day}:day: à ${time}:time:`
        : $localize`:@@opening.closedUntil:Fermé — ouvre à ${time}:time:`;
    }
  }
}

/**
 * État d'ouverture du restaurant (ouvert, fermé, en pause), lu sur la route publique : partagé
 * par le back-office et la commande en ligne. Rien n'est demandé avant `load()`.
 * Relu à chaque `AvailabilityChanged` (portée `opening`), à chaque resynchronisation et à
 * l'échéance de la prochaine bascule horaire.
 */
@Service()
export class OpeningStateService {
  private readonly publicApi = inject(PublicService);
  private readonly realtime = inject(RealtimeService);

  private readonly requested = signal(false);
  private readonly resource = rxResource({
    params: () => (this.requested() ? true : undefined),
    stream: () => this.publicApi.status(),
  });

  readonly state = computed<OpeningStateDto | undefined>(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );
  readonly isLoading = this.resource.isLoading;
  readonly error = this.resource.error;

  constructor() {
    // Les bascules dues à l'horloge ne sont pas poussées : relire à la prochaine échéance.
    effect((onCleanup) => {
      const state = this.state();
      const delay = state ? nextBoundaryDelay(state) : null;
      if (delay === null) {
        return;
      }
      const timer = setTimeout(() => this.reload(), delay);
      onCleanup(() => clearTimeout(timer));
    });
    merge(
      this.realtime.on('AvailabilityChanged').pipe(filter(({ scope }) => scope === 'opening')),
      this.realtime.resync,
    ).subscribe(() => this.reload());
  }

  /** Premier chargement ; ensuite le temps réel et les échéances déclenchent les relectures. */
  load(): void {
    this.requested.set(true);
  }

  reload(): void {
    if (this.requested()) {
      this.resource.reload();
    }
  }

  /** État renvoyé par une écriture (pause, reprise) : affiché sans relecture. */
  apply(state: OpeningStateDto): void {
    this.resource.set(state);
  }
}
