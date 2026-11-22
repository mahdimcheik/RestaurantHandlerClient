import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { OptionGroupsService } from '../../../../shared/services/option-groups.service';
import { StoreService } from '../../../../shared/services/store.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { StatusBadges } from '../../components/status-badges';

@Component({
  selector: 'app-option-group-list-page',
  imports: [RouterLink, Icon, StatusBadges],
  templateUrl: './option-group-list-page.html',
})
export class OptionGroupListPage {
  private readonly store = inject(StoreService);
  private readonly groups = inject(OptionGroupsService);

  protected readonly showArchived = signal(false);
  private readonly withArchived = rxResource({
    params: () => (this.showArchived() ? true : undefined),
    stream: () => this.groups.list({ includeArchived: true }),
  });

  protected readonly rows = computed(() =>
    this.showArchived() ? (this.withArchived.value() ?? []) : this.store.optionGroups.value(),
  );
  protected readonly loading = computed(() =>
    this.showArchived() ? this.withArchived.isLoading() : this.store.optionGroups.isLoading(),
  );
  protected readonly error = computed(() => {
    const error = this.showArchived() ? this.withArchived.error() : this.store.optionGroups.error();
    return error ? apiErrorMessage(error) : '';
  });

  constructor() {
    this.store.optionGroups.load();
  }
}
