import { Component, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderDetails } from '../../../../core/api/generated';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import {
  ConnectionBanner,
  ConnectionStatus,
} from '../../../../shared/ui/connection-status/connection-status';
import { Icon } from '../../../../shared/ui/icon/icon';
import { statusLabel } from '../../../../shared/ui/order-status/order-status';
import { ReasonDialog } from '../../../../shared/ui/reason-dialog/reason-dialog';
import { ThemeSwitcher } from '../../../../shared/ui/theme-switcher/theme-switcher';
import { KitchenTicket } from '../../components/kitchen-ticket';
import { KitchenBoard } from '../../data-access/kitchen-board';

/**
 * Écran cuisine (E07) : commandes à commencer et en préparation, en deux colonnes triées par
 * heure de retrait ; une touche par étape, dernier geste annulable ; bandeau rouge si la
 * connexion manque. Au-dessus, les commandes à payer au retrait à accepter ou refuser.
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
    ReasonDialog,
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

  constructor() {
    inject(RealtimeService).start();
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
