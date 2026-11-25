import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicStore } from '../../services/public-store.service';
import { SITE_DETAILS } from '../../site-details';
import { NgOptimizedImage } from '@angular/common';

/**
 * Pied de page du nouveau design : nom, adresse et téléphone du restaurant, liens de
 * commande et liens d'information. Le thème se règle depuis la barre du haut.
 */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, NgOptimizedImage],
  template: `
    <footer class="site-footer brand gutter">
      <div class="site-footer__grid">
        <div class="site-footer__brand">
          @if (logoUrl(); as logo) {
            <a class="site-footer__logo-link" routerLink="/">
              <img class="site-footer__logo" [ngSrc]="logo" fill sizes="12rem" [alt]="name()" />
            </a>
          }
          <p class="site-footer__name">{{ name() }}</p>
          @if (info()?.address; as address) {
            <p>{{ address }}</p>
          }
          @if (info()?.phone; as phone) {
            <a class="site-footer__link" [href]="phoneHref()">{{ phone }}</a>
          }
        </div>

        <nav aria-labelledby="footer-order">
          <p id="footer-order" class="site-footer__title">Commander</p>
          <ul class="site-footer__links">
            <li><a class="site-footer__link" routerLink="/carte">La carte</a></li>
            <li><a class="site-footer__link" routerLink="/commander">Commander en ligne</a></li>
            <li><a class="site-footer__link" routerLink="/commandes">Mes commandes</a></li>
            <li><a class="site-footer__link" routerLink="/a-propos">À propos</a></li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-info">
          <p id="footer-info" class="site-footer__title">Informations</p>
          <ul class="site-footer__links">
            <li><a class="site-footer__link" routerLink="/" fragment="contact">Contact</a></li>
            <li><a class="site-footer__link" routerLink="/allergenes">Allergènes</a></li>
            <li><a class="site-footer__link" routerLink="/cgv">CGV</a></li>
            <li>
              <a class="site-footer__link" routerLink="/confidentialite">Confidentialité</a>
            </li>
            <li>
              <a class="site-footer__link" routerLink="/mentions-legales">Mentions légales</a>
            </li>
            @if (instagramUrl) {
              <li>
                <a class="site-footer__link" [href]="instagramUrl" rel="noopener">Instagram</a>
              </li>
            }
          </ul>
        </nav>
      </div>
      <p class="site-footer__copy">© {{ year }} {{ name() }}</p>
    </footer>
  `,
})
export class SiteFooter {
  private readonly store = inject(PublicStore);

  protected readonly info = this.store.info.value;
  protected readonly name = computed(() => this.info()?.tradeName || 'Greenadine');
  protected readonly phoneHref = computed(
    () => `tel:${(this.info()?.phone ?? '').replace(/\s/g, '')}`,
  );
  protected readonly year = new Date().getFullYear();
  protected readonly instagramUrl = SITE_DETAILS.instagramUrl;
  protected readonly logoUrl = computed(() => this.store.info.value()?.logoUrl ?? null);

  constructor() {
    this.store.info.load();
  }
}
