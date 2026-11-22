import { computed, signal, Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map, Observable } from 'rxjs';

/** Enveloppe commune des réponses de l'API : la donnée utile est dans `data`. */
export interface ApiEnvelope<T> {
  data?: T | null;
}

/**
 * Donnée de l'API qui change rarement, chargée une fois puis partagée.
 * Rien n'est demandé au serveur avant le premier `load()`.
 * À instancier dans un contexte d'injection (champ d'un service).
 */
export class Cached<T> {
  private readonly requested = signal(false);
  private readonly resource;

  /** Dernière valeur reçue ; `fallback` tant que rien n'est chargé ou en cas d'erreur. */
  readonly value: Signal<T>;
  readonly isLoading: Signal<boolean>;
  readonly error: Signal<Error | undefined>;

  constructor(load: () => Observable<ApiEnvelope<T>>, fallback: T) {
    this.resource = rxResource({
      params: () => (this.requested() ? true : undefined),
      stream: () => load().pipe(map((response) => response.data ?? fallback)),
      defaultValue: fallback,
    });
    this.value = computed(() => (this.resource.hasValue() ? this.resource.value() : fallback));
    this.isLoading = this.resource.isLoading;
    this.error = this.resource.error;
  }

  /** Déclenche le premier chargement ; sans effet s'il a déjà eu lieu. */
  load(): void {
    this.requested.set(true);
  }

  /** Recharge depuis le serveur, uniquement si la donnée a déjà été demandée. */
  reload(): void {
    if (this.requested()) {
      this.resource.reload();
    }
  }
}
