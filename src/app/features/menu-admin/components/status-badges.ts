import { Component, input } from '@angular/core';

/** Statut d'un élément de la carte, écrit en toutes lettres. */
@Component({
  selector: 'app-status-badges',
  template: `
    <span class="badges">
      @if (archived()) {
        <span class="badge badge--muted" i18n="@@status.archived">Archivé</span>
      } @else {
        @if (!active()) {
          <span class="badge badge--muted" i18n="@@status.inactive">Inactif</span>
        }
        @if (!available()) {
          <span class="badge badge--danger" i18n="@@status.outOfStock">Rupture</span>
        }
        @if (active() && available()) {
          <span class="badge" i18n="@@status.active">Actif</span>
        }
      }
    </span>
  `,
})
export class StatusBadges {
  readonly archived = input(false);
  readonly active = input(true);
  readonly available = input(true);
}
