import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeSwitcher } from '../theme-switcher/theme-switcher';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, ThemeSwitcher],
  template: `
    <footer class="site-footer gutter">
      <ul class="inline-list">
        <li><a routerLink="/" fragment="infos">Contact</a></li>
        <li>
          <a href="https://www.instagram.com/" rel="noopener"> Instagram </a>
        </li>
        <li><a routerLink="/mentions-legales">Mentions légales</a></li>
        <li><a routerLink="/cgv">CGV</a></li>
        <li>
          <a routerLink="/confidentialite">Confidentialité</a>
        </li>
        <li><a routerLink="/allergenes">Allergènes</a></li>
      </ul>
      <app-theme-switcher />
      <p class="site-footer__copy">© {{ year }} Greenadine</p>
    </footer>
  `,
})
export class SiteFooter {
  protected readonly year = new Date().getFullYear();
}
