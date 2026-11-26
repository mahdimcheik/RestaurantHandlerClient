import { Component, computed, effect, inject, viewChild } from '@angular/core';
import { OrderDetails } from '../../../../core/api/generated';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ModalDialog } from '../../../../shared/ui/modal-dialog/modal-dialog';
import { statusLabel } from '../../../../shared/ui/order-status/order-status';
import { EurosPipe } from '../../../../shared/utils/money';
import { RestaurantTimePipe } from '../../../../shared/utils/restaurant-time';
import { KitchenOrderDetails } from '../../components/kitchen-order-details';
import { KitchenTicket } from '../../components/kitchen-ticket';
import { KitchenBoard } from '../../data-access/kitchen-board';

/**
 * Écran cuisine (E07) : commandes à commencer, en préparation et prêtes, en colonnes triées par
 * heure de retrait ; une touche par étape, dernier geste annulable ; bandeau rouge si la
 * connexion manque (bandeau et barre portés par la coquille Service). Toutes les commandes
 * arrivent payées en ligne (ADR-0013). Toucher un numéro ouvre le détail avec les prix,
 * par-dessus l'écran ; on y remet une commande prête.
 */
@Component({
  selector: 'app-kitchen-page',
  host: { class: 'kds' },
  imports: [
    Icon,
    KitchenTicket,
    KitchenOrderDetails,
    ModalDialog,
    EurosPipe,
    RestaurantTimePipe,
  ],
  providers: [KitchenBoard],
  templateUrl: './kitchen-page.html',
})
export class KitchenPage {
  protected readonly board = inject(KitchenBoard);
  protected readonly statusLabel = statusLabel;
  private readonly detailsDialog = viewChild.required<ModalDialog>('detailsDialog');
  protected readonly detailsTitle = computed(() => {
    const order = this.board.detail();
    return order ? `Commande n° ${order.dailyNumber}` : 'Commande';
  });

  constructor() {
    let open = false;
    effect(() => {
      const wanted = this.board.detailRequested();
      if (wanted && !open) {
        this.detailsDialog().open();
      } else if (!wanted && open) {
        this.detailsDialog().close();
      }
      open = wanted;
    });
  }

  protected closeDetails(): void {
    this.board.closeDetails();
  }

  protected complete(order: OrderDetails): void {
    this.board.complete(order, () => this.board.closeDetails());
  }
}
