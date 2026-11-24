import { Component, inject, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicStore } from '../../shared/services/public-store.service';

export type LegalPageKind = 'terms' | 'privacy' | 'notice' | 'allergens';

/**
 * Pages légales. L'identité du vendeur vient de `/restaurant/info` ; les textes eux-mêmes sont à
 * rédiger hors du code et à faire valider (conformité, questions ouvertes 6 et 8) : chaque
 * rubrique encore vide est signalée comme telle, rien n'est inventé.
 */
@Component({
  selector: 'app-legal-page',
  host: { class: 'shop' },
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './legal-page.html',
})
export class LegalPage {
  private readonly store = inject(PublicStore);

  /** Donnée de route `page`. */
  readonly page = input.required<LegalPageKind>();

  protected readonly info = this.store.info.value;

  constructor() {
    this.store.info.load();
  }
}
