import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderDetails } from '../../../../core/api/generated';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import {
  ConnectionBanner,
  ConnectionStatus,
} from '../../../../shared/ui/connection-status/connection-status';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ModalDialog } from '../../../../shared/ui/modal-dialog/modal-dialog';
import { statusLabel } from '../../../../shared/ui/order-status/order-status';
import { ReasonDialog } from '../../../../shared/ui/reason-dialog/reason-dialog';
import { ThemeSwitcher } from '../../../../shared/ui/theme-switcher/theme-switcher';
import { EurosPipe } from '../../../../shared/utils/money';
import { RestaurantTimePipe } from '../../../../shared/utils/restaurant-time';
import { KitchenOrderDetails } from '../../components/kitchen-order-details';
import { KitchenTicket } from '../../components/kitchen-ticket';
import { KitchenBoard } from '../../data-access/kitchen-board';

/**
 * Écran cuisine (E07) : commandes à commencer, en préparation et prêtes, en colonnes triées par
 * heure de retrait ; une touche par étape, dernier geste annulable ; bandeau rouge si la
 * connexion manque. Au-dessus, les commandes à payer au retrait à accepter ou refuser. Toucher
 * un numéro ouvre le détail avec les prix, par-dessus l'écran ; une commande prête et payée se
 * remet de là.
 */
@Component({
  selector: 'app-kitchen-page',
  host: { class: 'kds' },
  imports: [
    RouterLink,
    Icon,
    ConnectionStatus,
    ConnectionBanner,
    ThemeSwitcher,
    KitchenTicket,
    KitchenOrderDetails,
    ModalDialog,
    ReasonDialog,
    EurosPipe,
    RestaurantTimePipe,
  ],
  providers: [KitchenBoard],
  templateUrl: './kitchen-page.html',
})
export class KitchenPage {
  protected readonly board = inject(KitchenBoard);
  protected readonly statusLabel = statusLabel;
  /** Commande dont le refus attend son motif. */
  protected readonly refusing = signal<OrderDetails | null>(null);
  private readonly refuseDialog = viewChild.required<ReasonDialog>('refuseDialog');
  private readonly detailsDialog = viewChild.required<ModalDialog>('detailsDialog');
  protected readonly detailsTitle = computed(() => {
    const order = this.board.detail();
    return order ? `Commande n° ${order.dailyNumber}` : 'Commande';
  });

  constructor() {
    inject(RealtimeService).start();
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

  protected askReason(order: OrderDetails): void {
    this.refusing.set(order);
    this.refuseDialog().open();
  }

  protected refuse(reason: string): void {
    const order = this.refusing();
    if (order) {
      this.board.refuse(order, reason);
    }
  }
}
