import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';
import { SiteTopbar } from '../site-topbar/site-topbar';

/**
 * Mise en page des écrans de compte, au nouveau design : barre du haut, accroche et assiette à
 * gauche (grand écran seulement), contenu de la page dans une carte à droite.
 */
@Component({
  selector: 'app-auth-layout',
  imports: [NgOptimizedImage, SiteTopbar],
  template: `
    <div class="brand brand-ui brand-page">
      <div class="waves" aria-hidden="true"></div>
      <app-site-topbar [tabs]="false" />
      <div class="auth gutter">
        <div class="auth__aside">
          <p class="eyebrow">Espace client</p>
          <p class="display-title">{{ tagline() }}</p>
          <p class="lead">{{ lead() }}</p>
          <div class="plate">
            <img
              class="plate__image"
              ngSrc="https://ik.imagekit.io/accompagnement/margaritta.png"
              width="525"
              height="526"
              priority
              alt=""
            />
          </div>
        </div>
        <div class="auth__card">
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class AuthLayout {
  /** Accroche en grand à gauche. */
  readonly tagline = input('Votre compte');
  readonly lead = input('Commandez en ligne et suivez vos commandes.');
}
