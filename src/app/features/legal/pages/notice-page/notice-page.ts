import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_DETAILS } from '../../../../shared/site-details';
import { LegalDocument, LegalSection } from '../../components/legal-document';
import { LegalIdentity } from '../../components/legal-identity';

/** Mentions légales (LCEN, art. 6) : éditeur, directeur de publication, hébergeur. */
@Component({
  selector: 'app-notice-page',
  imports: [LegalDocument, LegalIdentity, RouterLink],
  templateUrl: './notice-page.html',
})
export class NoticePage {
  protected readonly details = SITE_DETAILS;
  protected readonly sections: LegalSection[] = [
    { id: 'editeur', label: 'Éditeur du site' },
    { id: 'hebergement', label: 'Hébergement' },
    { id: 'propriete', label: 'Propriété intellectuelle' },
    { id: 'donnees', label: 'Données personnelles' },
    { id: 'contact', label: 'Nous contacter' },
  ];
}
