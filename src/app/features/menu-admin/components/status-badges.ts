import { Component, input } from '@angular/core';

/** Statut d'un élément de la carte, écrit en toutes lettres. */
@Component({
  selector: 'app-status-badges',
  template: `
    <span class="badges">
      @if (archived()) {
        <span class="badge badge--muted">Archivé</span>
      } @else {
        @if (!active()) {
          <span class="badge badge--muted">Inactif</span>
        }
        @if (!available()) {
          <span class="badge badge--danger">Rupture</span>
        }
        @if (active() && available()) {
          <span class="badge">Actif</span>
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
