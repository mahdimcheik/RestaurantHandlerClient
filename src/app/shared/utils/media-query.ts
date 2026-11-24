import { DestroyRef, DOCUMENT, inject, signal, Signal } from '@angular/core';

/**
 * Vrai tant que la requête média correspond (largeur d'écran…), suivi en direct. À appeler dans
 * un contexte d'injection. Sans `matchMedia` (tests, rendu serveur), toujours faux.
 */
export function mediaQuery(query: string): Signal<boolean> {
  const list = inject(DOCUMENT).defaultView?.matchMedia?.(query);
  const matches = signal(list?.matches ?? false);
  if (list) {
    const listener = (event: MediaQueryListEvent) => matches.set(event.matches);
    list.addEventListener('change', listener);
    inject(DestroyRef).onDestroy(() => list.removeEventListener('change', listener));
  }
  return matches.asReadonly();
}
