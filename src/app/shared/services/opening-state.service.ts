import { computed, effect, inject, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import { OpeningStateDto, PauseRequest } from '../../core/api/generated';
import { PublicService } from './public.service';
import { RestaurantService } from './restaurant.service';
import { StoreService } from './store.service';
import { splitMoment } from '../utils/restaurant-time';

/** Relecture de l'état en attendant le temps réel (F4). */
export const OPENING_STATE_POLL_MS = 60_000;

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
 * État d'ouverture du restaurant (ouvert, fermé, en pause) partagé par le back-office,
 * avec la pause et la reprise des commandes en ligne. Rien n'est demandé avant `load()`.
 */
@Service()
export class OpeningStateService {
  private readonly publicApi = inject(PublicService);
  private readonly restaurant = inject(RestaurantService);
  private readonly store = inject(StoreService);

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
    // Une pause à durée se termine côté serveur : relire l'état à son échéance.
    effect((onCleanup) => {
      const until = this.state()?.pausedUntil;
      if (!until) {
        return;
      }
      const delay = Math.max(0, new Date(until).getTime() - Date.now()) + 1_000;
      const timer = setTimeout(() => this.resource.reload(), delay);
      onCleanup(() => clearTimeout(timer));
    });
  }

  /** Premier chargement, puis relecture régulière. Sans effet après le premier appel. */
  load(): void {
    if (this.requested()) {
      return;
    }
    this.requested.set(true);
    setInterval(() => this.resource.reload(), OPENING_STATE_POLL_MS);
  }

  reload(): void {
    if (this.requested()) {
      this.resource.reload();
    }
  }

  /** `durationMinutes` : 15, 30 ou 60 ; `null` jusqu'à la reprise. */
  pause(durationMinutes: PauseRequest['durationMinutes']): Observable<OpeningStateDto> {
    return this.restaurant.pause({ durationMinutes }).pipe(tap((state) => this.apply(state)));
  }

  resume(): Observable<OpeningStateDto> {
    return this.restaurant.resume().pipe(tap((state) => this.apply(state)));
  }

  /** Délai ASAP annoncé aux clients, ajustable pendant le service. */
  setAsapDelay(minutes: number): Observable<unknown> {
    return this.restaurant.updateAsapDelay(minutes).pipe(tap(() => this.reload()));
  }

  private apply(state: OpeningStateDto): void {
    this.resource.set(state);
    this.store.settings.reload();
  }
}
