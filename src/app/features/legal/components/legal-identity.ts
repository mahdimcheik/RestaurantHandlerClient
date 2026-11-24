import { Component, inject } from '@angular/core';
import { PublicStore } from '../../../shared/services/public-store.service';
import { SITE_DETAILS } from '../../../shared/site-details';

/**
 * Identité du restaurant pour les pages légales : raison sociale, enseigne, adresse, SIRET, TVA
 * et téléphone depuis `/restaurant/info`, e-mail depuis `SITE_DETAILS`.
 */
@Component({
  selector: 'app-legal-identity',
  template: `
    @if (info(); as info) {
      <dl class="legal__facts">
        <div>
          <dt>Raison sociale</dt>
          <dd>{{ info.legalName || info.tradeName }}</dd>
        </div>
        @if (info.legalName && info.legalName !== info.tradeName) {
          <div>
            <dt>Enseigne</dt>
            <dd>{{ info.tradeName }}</dd>
          </div>
        }
        <div>
          <dt>Adresse</dt>
          <dd>
            @if (info.address) {
              {{ info.address }}
            } @else {
              <span class="legal__todo">À compléter</span>
            }
          </dd>
        </div>
        @if (info.siret) {
          <div>
            <dt>SIRET</dt>
            <dd>{{ info.siret }}</dd>
          </div>
        }
        @if (info.vatNumber) {
          <div>
            <dt>N° TVA</dt>
            <dd>{{ info.vatNumber }}</dd>
          </div>
        }
        @if (info.phone) {
          <div>
            <dt>Téléphone</dt>
            <dd>
              <a [href]="'tel:' + info.phone.replaceAll(' ', '')">{{ info.phone }}</a>
            </dd>
          </div>
        }
        <div>
          <dt>E-mail</dt>
          <dd>
            @if (email) {
              <a [href]="'mailto:' + email">{{ email }}</a>
            } @else {
              <span class="legal__todo">À compléter</span>
            }
          </dd>
        </div>
      </dl>
    } @else {
      <p role="status">Chargement…</p>
    }
  `,
})
export class LegalIdentity {
  private readonly store = inject(PublicStore);

  protected readonly info = this.store.info.value;
  protected readonly email = SITE_DETAILS.email;

  constructor() {
    this.store.info.load();
  }
}
