import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  template: `
    <footer class="site-footer gutter">
      <ul class="inline-list">
        <li><a routerLink="/contact" i18n="@@footer.contact">Contact</a></li>
        <li>
          <a href="https://www.instagram.com/" rel="noopener" i18n="@@footer.instagram">
            Instagram
          </a>
        </li>
        <li><a routerLink="/mentions-legales" i18n="@@footer.legal">Mentions légales</a></li>
      </ul>
      <p class="site-footer__copy" i18n="@@footer.copy">© {{ year }} Le Restaurant</p>
    </footer>
  `,
})
export class SiteFooter {
  protected readonly year = new Date().getFullYear();
}
