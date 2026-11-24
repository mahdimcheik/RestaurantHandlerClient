import { OpeningStateDto } from '../../core/api/generated';
import { describeOpening } from '../../shared/services/opening-state.service';

/** État d'ouverture pour le client : « Ouvert — ferme à 14:30 · prêt en ~15 min ». */
export function customerOpeningText(state: OpeningStateDto, now: Date = new Date()): string {
  const text = describeOpening(state, now);
  return state.status === 'Open'
    ? $localize`:@@shop.openingAsap:${text}:state: · prêt en ~${state.asapDelayMinutes}:minutes: min`
    : text;
}
