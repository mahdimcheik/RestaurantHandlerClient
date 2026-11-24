import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { OpeningStateService } from '../../../../shared/services/opening-state.service';
import { PublicStore } from '../../../../shared/services/public-store.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SiteTopbar } from '../../../../shared/ui/site-topbar/site-topbar';
import { DishCard } from '../../components/dish-card/dish-card';
import { IngredientsInfo } from '../../components/ingredients-info/ingredients-info';
import { OrderDialog } from '../../components/order-dialog/order-dialog';
import { cardSections, Dish } from '../../data-access/card-sections';
import { customerOpeningText } from '../../opening-text';

/** Ancre d'une rubrique dans la page. */
export const sectionAnchor = (sectionId: string) => `rubrique-${sectionId}`;

/**
 * Carte du restaurant à consulter : toutes les rubriques à la suite, avec les mêmes cartes produit
 * que la page de commande. Une barre collante mène à chaque rubrique ; un article ouvre sa fiche
 * de commande, le bouton info ses ingrédients sur place. Relue en temps réel (ruptures).
 */
@Component({
  selector: 'app-menu-board-page',
  imports: [RouterLink, Icon, SiteTopbar, DishCard, IngredientsInfo, OrderDialog],
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

  /** Produit dont les ingrédients sont affichés dans le dialogue. */
  protected readonly ingredientsOf = signal<Dish | null>(null);
  protected readonly ingredientsOpen = signal(false);

  constructor() {
    inject(RealtimeService).start();
    this.store.card.load();
    this.opening.load();
  }

  protected showIngredients(dish: Dish): void {
    this.ingredientsOf.set(dish);
    this.ingredientsOpen.set(true);
  }
}
