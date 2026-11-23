import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { MenusService } from '../../../../shared/services/menus.service';
import { StoreService } from '../../../../shared/services/store.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { EurosPipe } from '../../../../shared/utils/money';
import { MoveButtons } from '../../components/move-buttons';
import { StatusBadges } from '../../components/status-badges';
import { ListOrder } from '../../reorder';

/** Menus (formules à prix fixe), dans l'ordre de la carte. */
@Component({
  selector: 'app-menu-list-page',
  imports: [RouterLink, Icon, StatusBadges, MoveButtons, EurosPipe],
  templateUrl: './menu-list-page.html',
})
export class MenuListPage {
  private readonly store = inject(StoreService);
  private readonly menus = inject(MenusService);

  protected readonly showArchived = signal(false);
  private readonly withArchived = rxResource({
    params: () => (this.showArchived() ? true : undefined),
    stream: () => this.menus.list({ includeArchived: true }),
  });

  protected readonly rows = computed(() =>
    this.showArchived() ? (this.withArchived.value() ?? []) : this.store.menus.value(),
  );
  protected readonly loading = computed(() =>
    this.showArchived() ? this.withArchived.isLoading() : this.store.menus.isLoading(),
  );
  protected readonly error = computed(() => {
    const error = this.showArchived() ? this.withArchived.error() : this.store.menus.error();
    return error ? apiErrorMessage(error) : '';
  });

  protected readonly order = new ListOrder(
    (orderedIds) => this.menus.reorder({ orderedIds }),
    () => this.store.menus.reload(),
  );

  constructor() {
    this.store.menus.load();
  }
}
