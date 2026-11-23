import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import {
  describeOpening,
  OpeningStateService,
} from '../../../../shared/services/opening-state.service';
import { PublicStore } from '../../../../shared/services/public-store.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { formatLocal } from '../../../../shared/utils/restaurant-time';
import { weeklyHours } from '../../home-format';

/** Accueil : nom, état d'ouverture en direct, accès à la carte, infos pratiques de l'API. */
@Component({
  selector: 'app-home-page',
  imports: [RouterLink, Icon],
  templateUrl: './home-page.html',
})
export class HomePage {
  private readonly store = inject(PublicStore);
  private readonly opening = inject(OpeningStateService);

  protected readonly info = this.store.info.value;
  protected readonly hours = computed(() => weeklyHours(this.info()?.hours ?? []));
  protected readonly closures = computed(() =>
    (this.info()?.upcomingClosures ?? []).map((closure) => ({
      id: closure.id,
      from: formatLocal(closure.startLocal),
      to: formatLocal(closure.endLocal),
      reason: closure.reason,
    })),
  );
  protected readonly status = computed(() => this.opening.state()?.status);
  protected readonly openingText = computed(() => {
    const state = this.opening.state();
    return state ? describeOpening(state) : '';
  });

  constructor() {
    inject(RealtimeService).start();
    this.store.info.load();
    this.opening.load();
  }
}
