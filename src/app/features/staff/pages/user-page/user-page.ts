import { Component, computed, inject, input, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AccountStatusEnum } from '../../../../core/api/generated';
import { SessionService } from '../../../../core/auth/session.service';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { ManageOrdersService } from '../../../../shared/services/manage-orders.service';
import { UserManagementService } from '../../../../shared/services/user-management.service';
import { UsersService } from '../../../../shared/services/users.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { channelLabel, OrderStatusBadge } from '../../../../shared/ui/order-status/order-status';
import { EurosPipe } from '../../../../shared/utils/money';
import { RestaurantDateTimePipe } from '../../../../shared/utils/restaurant-time';
import { ACCOUNT_STATUS_LABELS, roleNames, userName, userStatus } from '../../staff-format';

export const ORDERS_PAGE_SIZE = 10;

/**
 * Fiche d'un compte (US-E10-1) : statut et bannissement (US-E10-3), compteur de non-venues et
 * levée du blocage du paiement au retrait (US-E10-4), commandes passées.
 */
@Component({
  selector: 'app-user-page',
  host: { class: 'page' },
  imports: [RouterLink, ConfirmDialog, Icon, OrderStatusBadge, EurosPipe, RestaurantDateTimePipe],
  templateUrl: './user-page.html',
})
export class UserPage {
  private readonly users = inject(UsersService);
  private readonly management = inject(UserManagementService);
  private readonly orders = inject(ManageOrdersService);
  private readonly session = inject(SessionService);

  readonly id = input.required<string>();

  protected readonly user = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.users.get(params),
  });
  protected readonly ordersPage = signal(1);
  protected readonly customerOrders = rxResource({
    params: () => ({ id: this.id(), page: this.ordersPage() }),
    stream: ({ params }) => this.orders.customerOrders(params.id, params.page, ORDERS_PAGE_SIZE),
  });

  protected readonly loadError = computed(() =>
    this.user.error() ? apiErrorMessage(this.user.error()) : '',
  );
  protected readonly ordersError = computed(() =>
    this.customerOrders.error() ? apiErrorMessage(this.customerOrders.error()) : '',
  );
  protected readonly status = computed(() => {
    return this.user.hasValue() ? userStatus(this.user.value()) : null;
  });
  /** Masque seulement les actions sur son propre compte : le serveur les refuse de toute façon. */
  protected readonly isSelf = computed(() => this.session.user()?.id === this.id());
  protected readonly ordersPageCount = computed(() =>
    Math.max(
      1,
      Math.ceil(
        (this.customerOrders.hasValue() ? this.customerOrders.value().count : 0) / ORDERS_PAGE_SIZE,
      ),
    ),
  );

  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  protected readonly statusLabels = ACCOUNT_STATUS_LABELS;
  protected readonly userName = userName;
  protected readonly roleNames = roleNames;
  protected readonly channelLabel = channelLabel;

  private readonly banDialog = viewChild.required<ConfirmDialog>('banDialog');
  private readonly resetDialog = viewChild.required<ConfirmDialog>('resetDialog');

  protected askBan(): void {
    this.banDialog().open();
  }

  protected askReset(): void {
    this.resetDialog().open();
  }

  protected setStatus(status: AccountStatusEnum): void {
    this.run(
      this.management.setStatus(this.id(), status),
      `Statut du compte : ${ACCOUNT_STATUS_LABELS[status]}.`,
    );
  }

  protected resetNoShows(): void {
    this.run(
      this.orders.resetCustomerNoShows(this.id()),
      'Le paiement au retrait est de nouveau autorisé.',
    );
  }

  protected previousOrders(): void {
    this.ordersPage.update((page) => Math.max(1, page - 1));
  }

  protected nextOrders(): void {
    this.ordersPage.update((page) => Math.min(this.ordersPageCount(), page + 1));
  }

  private run(action: Observable<unknown>, done: string): void {
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    action.subscribe({
      next: () => {
        this.busy.set(false);
        this.notice.set(done);
        this.user.reload();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(apiErrorMessage(error));
        this.user.reload();
      },
    });
  }
}
