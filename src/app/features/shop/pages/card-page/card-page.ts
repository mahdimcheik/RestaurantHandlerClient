import {
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { OpeningStateService } from '../../../../shared/services/opening-state.service';
import { PublicStore } from '../../../../shared/services/public-store.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SiteTopbar } from '../../../../shared/ui/site-topbar/site-topbar';
import { mediaQuery } from '../../../../shared/utils/media-query';
import { CartSummary } from '../../components/cart-summary/cart-summary';
import { CategoryRail } from '../../components/category-rail/category-rail';
import { DishPanel } from '../../components/dish-panel/dish-panel';
import { OrderAside } from '../../components/order-aside/order-aside';
import { OrderBar } from '../../components/order-bar/order-bar';
import { OrderDialog } from '../../components/order-dialog/order-dialog';
import { CardSection, cardSections } from '../../data-access/card-sections';
import { CartStore } from '../../data-access/cart.store';
import { customerOpeningText } from '../../opening-text';

/**
 * Carte en ligne (US-E02-1) : rubriques dans un rail vertical à gauche (une seule affichée à la
 * fois), articles de la rubrique, détail de la commande dans une colonne à droite sur grand écran
 * ou dans une feuille ouverte depuis le bandeau du bas sur téléphone. La fiche d'un produit ou d'un
 * menu (routes enfants) s'ouvre dans un dialogue par-dessus la carte. Relue en temps réel.
 */
@Component({
  selector: 'app-card-page',
  imports: [
    RouterOutlet,
    Icon,
    SiteTopbar,
    CartSummary,
    CategoryRail,
    DishPanel,
    OrderAside,
    OrderBar,
    OrderDialog,
  ],
  templateUrl: './card-page.html',
})
export class CardPage implements OnDestroy {
  private readonly store = inject(PublicStore);
  private readonly opening = inject(OpeningStateService);
  private readonly router = inject(Router);
  protected readonly cart = inject(CartStore);

  /** Grand écran : le détail de la commande est toujours affiché à droite. */
  protected readonly wide = mediaQuery('(min-width: 64rem)');

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

  /** Rubrique choisie : gardée tant qu'elle existe, sinon la première. */
  protected readonly selectedId = linkedSignal<CardSection[], string>({
    source: this.sections,
    computation: (sections, previous) =>
      previous && sections.some((section) => section.id === previous.value)
        ? previous.value
        : (sections[0]?.id ?? ''),
  });
  protected readonly selected = computed(() =>
    this.sections().find((section) => section.id === this.selectedId()),
  );

  /** Feuille « Votre commande » ouverte (téléphone). */
  protected readonly cartOpen = signal(false);
  /** Fiche produit ou menu affichée par-dessus la carte. */
  protected readonly sheetOpen = signal(false);

  private readonly outlet = viewChild.required(RouterOutlet);

  constructor() {
    inject(RealtimeService).start();
    this.store.card.load();
    this.opening.load();
    // Écran élargi ou panier vidé : la feuille n'a plus lieu d'être.
    effect(() => {
      if (this.wide() || this.cart.isEmpty()) {
        this.cartOpen.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.cart.removed.set([]);
  }

  protected onSheetActivate(): void {
    this.cartOpen.set(false);
    this.sheetOpen.set(true);
  }

  /** Fiche refermée (Échap, bouton Fermer, clic hors de la fiche) : retour à la carte. */
  protected onSheetClosed(): void {
    if (this.outlet().isActivated) {
      void this.router.navigate(['/commander'], { scroll: 'manual' });
    }
  }
}
