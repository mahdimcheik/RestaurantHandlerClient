import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../core/auth/session.service';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink],
  template: `
    <header class="site-header gutter">
      <a class="site-header__brand" routerLink="/" i18n="@@brand">Le Restaurant</a>
      <nav class="inline-list" aria-label="Navigation principale" i18n-aria-label="@@nav.label">
        <a routerLink="/" fragment="infos" i18n="@@nav.info">Infos</a>
        @if (session.user(); as user) {
          @if (session.isManager()) {
            <a routerLink="/gestion" i18n="@@nav.admin">Gestion</a>
          }
          <span class="site-header__user">{{ user.firstName }}</span>
          <button type="button" class="link-button" (click)="logout()" i18n="@@nav.logout">
            Déconnexion
          </button>
        } @else {
          <a routerLink="/auth/connexion" i18n="@@nav.login">Connexion</a>
        }
        <a class="btn btn--outline" routerLink="/commander" i18n="@@header.order">Commander</a>
      </nav>
    </header>
  `,
})
export class SiteHeader {
  protected readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.session.logout().subscribe(() => void this.router.navigateByUrl('/'));
  }
}
