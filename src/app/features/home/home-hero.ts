import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export type HomeHero = 'carousel' | 'slider';

/** Bloc du haut de l'accueil, choisi au build par `HOME_HERO` dans `src/environments/`. */
export const HOME_HERO = new InjectionToken<HomeHero>('HOME_HERO', {
  factory: () => environment.HOME_HERO,
});
