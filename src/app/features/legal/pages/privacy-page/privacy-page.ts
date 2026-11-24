import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_DETAILS } from '../../../../shared/site-details';
import { LegalDocument, LegalSection } from '../../components/legal-document';
import { LegalIdentity } from '../../components/legal-identity';

/**
 * Politique de confidentialité, texte générique tiré de la doc de conformité (RGPD, § 5) : à faire
 * relire par un professionnel avant l'ouverture de la commande en ligne.
 */
@Component({
  selector: 'app-privacy-page',
  imports: [LegalDocument, LegalIdentity, RouterLink],
  templateUrl: './privacy-page.html',
})
export class PrivacyPage {
  protected readonly details = SITE_DETAILS;
  protected readonly sections: LegalSection[] = [
    { id: 'responsable', label: 'Responsable du traitement' },
    { id: 'donnees', label: 'Données collectées' },
    { id: 'finalites', label: 'Finalités et bases légales' },
    { id: 'conservation', label: 'Durées de conservation' },
    { id: 'destinataires', label: 'Destinataires et sous-traitants' },
    { id: 'cookies', label: 'Cookies et stockage sur l’appareil' },
    { id: 'securite', label: 'Sécurité' },
    { id: 'droits', label: 'Vos droits' },
    { id: 'modifications', label: 'Modifications' },
  ];
}
