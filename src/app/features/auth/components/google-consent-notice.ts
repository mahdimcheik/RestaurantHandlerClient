import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Mention affichée sous « Continuer avec Google » quand le clic crée le compte : elle vaut
 * acceptation des CGU, de la politique de confidentialité et du traitement des données
 * (l'API horodate l'acceptation et la version des CGU).
 */
@Component({
  selector: 'app-google-consent-notice',
  imports: [RouterLink],
  template: `
    <p class="field__hint google-consent-notice">
      En continuant avec Google, vous acceptez les
      <a routerLink="/cgv" target="_blank">conditions générales</a>, la
      <a routerLink="/confidentialite" target="_blank">politique de confidentialité</a> et le
      traitement de vos données pour gérer votre compte et vos commandes.
    </p>
  `,
})
export class GoogleConsentNotice {}
