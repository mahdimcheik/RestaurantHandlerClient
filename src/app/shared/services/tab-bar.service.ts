import { computed, Service, signal } from '@angular/core';

/**
 * Pages qui demandent la barre d'onglets du bas. La barre vit dans la coquille de l'application
 * (hors des surfaces `.brand`, qui isolent leur empilement) ; une page la demande par sa barre du
 * haut et la rend en la quittant.
 */
@Service()
export class TabBarState {
  private readonly requests = signal(0);

  readonly visible = computed(() => this.requests() > 0);

  /** Demande la barre ; la fonction renvoyée la rend. */
  request(): () => void {
    this.requests.update((count) => count + 1);
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.requests.update((count) => count - 1);
      }
    };
  }
}
