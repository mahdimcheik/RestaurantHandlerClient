import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AccountStatusEnum, FilterUsers } from '../../../../core/api/generated';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { StoreService } from '../../../../shared/services/store.service';
import { ACCOUNT_STATUS_IDS } from '../../../../shared/services/user-management.service';
import { UsersService } from '../../../../shared/services/users.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATUSES,
  roleNames,
  userName,
  userStatus,
} from '../../staff-format';

export const PAGE_SIZE = 20;

interface Criteria {
  search: string;
  roleId: string;
  status: AccountStatusEnum | '';
}

/**
 * Comptes (US-E10-1) : recherche par nom, e-mail ou téléphone, filtres par rôle et statut,
 * liste paginée côté serveur.
 */
@Component({
  selector: 'app-user-list-page',
  host: { class: 'page' },
  imports: [RouterLink, Icon],
  templateUrl: './user-list-page.html',
})
export class UserListPage {
  private readonly users = inject(UsersService);
  protected readonly store = inject(StoreService);

  protected readonly criteria = signal<Criteria>({ search: '', roleId: '', status: '' });
  protected readonly page = signal(0);

  protected readonly list = rxResource({
    params: () => {
      const { search, roleId, status } = this.criteria();
      const filter: FilterUsers = {
        name: search.trim() || null,
        roleId: roleId || null,
        statusId: status ? ACCOUNT_STATUS_IDS[status] : null,
        first: this.page() * PAGE_SIZE,
        row: PAGE_SIZE,
      };
      return filter;
    },
    stream: ({ params }) => this.users.filter(params),
  });
  protected readonly loadError = computed(() =>
    this.list.error() ? apiErrorMessage(this.list.error()) : '',
  );
  protected readonly rows = computed(() => (this.list.hasValue() ? this.list.value().items : []));
  protected readonly total = computed(() => (this.list.hasValue() ? this.list.value().count : 0));
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));

  protected readonly statuses = ACCOUNT_STATUSES.map((value) => ({
    value,
    label: ACCOUNT_STATUS_LABELS[value],
  }));
  protected readonly statusLabels = ACCOUNT_STATUS_LABELS;
  protected readonly userName = userName;
  protected readonly roleNames = roleNames;
  protected readonly userStatus = userStatus;

  constructor() {
    this.store.roles.load();
  }

  protected search(event: Event, search: string, roleId: string, status: string): void {
    event.preventDefault();
    this.page.set(0);
    this.criteria.set({
      search,
      roleId,
      status: ACCOUNT_STATUSES.find((value) => value === status) ?? '',
    });
  }

  protected previous(): void {
    this.page.update((page) => Math.max(0, page - 1));
  }

  protected next(): void {
    this.page.update((page) => Math.min(this.pageCount() - 1, page + 1));
  }
}
