import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicStore } from '../../services/public-store.service';

/**
 * Pied de page du nouveau design (parfum 1) : nom, adresse et téléphone du restaurant, liens de
 * commande et liens d'information. Le thème se règle depuis la barre du haut.
 */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  template: `
    <footer class="site-footer brand brand--1 gutter">
      <div class="site-footer__grid">
        <div class="site-footer__brand">
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
            <li><a class="site-footer__link" routerLink="/" fragment="infos">Contact</a></li>
            <li><a class="site-footer__link" routerLink="/allergenes">Allergènes</a></li>
            <li><a class="site-footer__link" routerLink="/cgv">CGV</a></li>
            <li>
              <a class="site-footer__link" routerLink="/confidentialite">Confidentialité</a>
            </li>
            <li>
              <a class="site-footer__link" routerLink="/mentions-legales">Mentions légales</a>
            </li>
            <li>
              <a class="site-footer__link" href="https://www.instagram.com/" rel="noopener">
                Instagram
              </a>
            </li>
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

  constructor() {
    this.store.info.load();
  }
}
