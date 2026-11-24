import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicStore } from '../../shared/services/public-store.service';
import { SITE_DETAILS } from '../../shared/site-details';
import { LegalDocument } from './components/legal-document';
import { LegalIdentity } from './components/legal-identity';

export type LegalPageKind = 'terms' | 'allergens';

/**
 * CGV et allergènes. Le texte des CGV reste à rédiger hors du code et à faire valider
 * (conformité, questions ouvertes 6 et 8) : chaque rubrique encore vide est signalée comme telle.
 */
@Component({
  selector: 'app-legal-page',
  imports: [RouterLink, LegalDocument, LegalIdentity],
  templateUrl: './legal-page.html',
})
export class LegalPage {
  private readonly store = inject(PublicStore);

  /** Donnée de route `page`. */
  readonly page = input.required<LegalPageKind>();

  protected readonly info = this.store.info.value;
  protected readonly updatedOn = SITE_DETAILS.legalUpdatedOn;

  constructor() {
    this.store.info.load();
  }
}
