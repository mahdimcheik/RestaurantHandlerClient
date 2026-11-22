import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink],
  template: `
    <header class="site-header gutter">
      <a class="site-header__brand" routerLink="/" i18n="@@brand">Le Restaurant</a>
      <nav class="inline-list" aria-label="Navigation principale" i18n-aria-label="@@nav.label">
        <a routerLink="/" fragment="infos" i18n="@@nav.info">Infos</a>
        <a class="btn btn--outline" routerLink="/commander" i18n="@@header.order">Commander</a>
      </nav>
    </header>
  `,
})
export class SiteHeader {}
