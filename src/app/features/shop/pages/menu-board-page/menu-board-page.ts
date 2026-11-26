import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { OpeningStateService } from '../../../../shared/services/opening-state.service';
import { PublicStore } from '../../../../shared/services/public-store.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SiteTopbar } from '../../../../shared/ui/site-topbar/site-topbar';
import { BoardCard } from '../../components/board-card/board-card';
import { cardSections } from '../../data-access/card-sections';
import { customerOpeningText } from '../../opening-text';

/** Ancre d'une rubrique dans la page. */
export const sectionAnchor = (sectionId: string) => `rubrique-${sectionId}`;

/**
 * Carte du restaurant à consulter : toutes les rubriques à la suite, en grandes cartes qui montrent
 * tout le détail (description, ingrédients, options, composition des menus). Une barre collante
 * mène à chaque rubrique ; un article ouvre sa fiche de commande. Relue en temps réel (ruptures).
 */
@Component({
  selector: 'app-menu-board-page',
  imports: [RouterLink, Icon, SiteTopbar, BoardCard],
  templateUrl: './menu-board-page.html',
})
export class MenuBoardPage {
  private readonly store = inject(PublicStore);
  private readonly opening = inject(OpeningStateService);

  protected readonly card = this.store.card.value;
  protected readonly loading = computed(() => this.store.card.isLoading() && !this.card());
  protected readonly error = computed(() =>
    this.store.card.error() && !this.card() ? apiErrorMessage(this.store.card.error()) : '',
  );
  protected readonly openingText = computed(() => {
    const state = this.opening.state() ?? this.card()?.opening;
    return state ? customerOpeningText(state) : '';
  });
  protected readonly status = computed(
    () => (this.opening.state() ?? this.card()?.opening)?.status,
  );

  protected readonly sections = computed(() => cardSections(this.card()));
  protected readonly anchor = sectionAnchor;

  constructor() {
    inject(RealtimeService).start();
    this.store.card.load();
    this.opening.load();
  }
}
