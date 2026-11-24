import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { OpeningStateService } from '../../../../shared/services/opening-state.service';
import { PublicStore } from '../../../../shared/services/public-store.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { EurosPipe } from '../../../../shared/utils/money';
import { CartStore } from '../../data-access/cart.store';
import { customerOpeningText } from '../../opening-text';

/**
 * Carte en ligne (US-E02-1) : état d'ouverture, catégories, produits et menus avec prix TTC,
 * articles en rupture grisés avec leur libellé. Relue en temps réel (rupture, pause).
 */
@Component({
  selector: 'app-card-page',
  host: { class: 'shop' },
  imports: [RouterLink, NgOptimizedImage, EurosPipe, Icon],
  templateUrl: './card-page.html',
})
export class CardPage implements OnDestroy {
  private readonly store = inject(PublicStore);
  private readonly opening = inject(OpeningStateService);
  protected readonly cart = inject(CartStore);

  protected readonly card = this.store.card.value;
  protected readonly categories = computed(() => this.card()?.categories ?? []);
  protected readonly menus = computed(() => this.card()?.menus ?? []);
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

  constructor() {
    inject(RealtimeService).start();
    this.store.card.load();
    this.opening.load();
  }

  ngOnDestroy(): void {
    this.cart.removed.set([]);
  }
}
