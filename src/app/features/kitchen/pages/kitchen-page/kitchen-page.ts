import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import {
  ConnectionBanner,
  ConnectionStatus,
} from '../../../../shared/ui/connection-status/connection-status';
import { Icon } from '../../../../shared/ui/icon/icon';
import { statusLabel } from '../../../../shared/ui/order-status/order-status';
import { ThemeSwitcher } from '../../../../shared/ui/theme-switcher/theme-switcher';
import { KitchenTicket } from '../../components/kitchen-ticket';
import { KitchenBoard } from '../../data-access/kitchen-board';

/**
 * Écran cuisine (E07) : commandes à commencer et en préparation, en deux colonnes triées par
 * heure de retrait ; une touche par étape, dernier geste annulable ; bandeau rouge si la
 * connexion manque.
 */
@Component({
  selector: 'app-kitchen-page',
  host: { class: 'kds' },
  imports: [RouterLink, Icon, ConnectionStatus, ConnectionBanner, ThemeSwitcher, KitchenTicket],
  providers: [KitchenBoard],
  templateUrl: './kitchen-page.html',
})
export class KitchenPage {
  protected readonly board = inject(KitchenBoard);
  protected readonly statusLabel = statusLabel;

  constructor() {
    inject(RealtimeService).start();
  }
}
