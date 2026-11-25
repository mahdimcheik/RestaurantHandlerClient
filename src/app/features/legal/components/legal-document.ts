import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteTopbar } from '../../../shared/ui/site-topbar/site-topbar';

/** Rubrique d'une page légale, listée au sommaire et atteinte par son ancre. */
export interface LegalSection {
  id: string;
  label: string;
}

/**
 * Coquille commune des pages légales (nouveau design) : barre du haut, titre, date de
 * mise à jour, introduction, sommaire à ancres, texte projeté, puis liens vers les autres pages.
 */
@Component({
  selector: 'app-legal-document',
  imports: [RouterLink, SiteTopbar],
  template: `
    <div class="brand brand-ui brand-page">
      <div class="waves" aria-hidden="true"></div>
      <app-site-topbar />

      <article class="legal gutter" aria-labelledby="legal-title">
        <header class="legal__head">
          <p class="eyebrow">Informations légales</p>
          <h1 id="legal-title" class="display-title display-title--md">{{ heading() }}</h1>
          @if (updatedOn(); as updatedOn) {
            <p class="legal__meta">Dernière mise à jour : {{ updatedOn }}</p>
          }
          @if (lead(); as lead) {
            <p class="lead">{{ lead }}</p>
          }
        </header>

        @if (sections().length > 0) {
          <nav class="legal__toc" aria-labelledby="legal-toc-title">
            <h2 id="legal-toc-title" class="legal__toc-title">Sommaire</h2>
            <ol>
              @for (section of sections(); track section.id) {
                <li>
                  <a routerLink="." [fragment]="section.id">{{ section.label }}</a>
                </li>
              }
            </ol>
          </nav>
        }

        <div class="legal__body">
          <ng-content />
        </div>

        <nav class="legal__links" aria-label="Informations légales">
          <a routerLink="/cgv">Conditions générales de vente</a>
          <a routerLink="/confidentialite">Politique de confidentialité</a>
          <a routerLink="/mentions-legales">Mentions légales</a>
          <a routerLink="/allergenes">Allergènes</a>
        </nav>
      </article>
    </div>
  `,
})
export class LegalDocument {
  readonly heading = input.required<string>();
  readonly updatedOn = input('');
  readonly lead = input('');
  readonly sections = input<LegalSection[]>([]);
}
