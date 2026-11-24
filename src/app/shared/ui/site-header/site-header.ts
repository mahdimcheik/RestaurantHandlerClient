import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../core/auth/session.service';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink],
  template: `
    <header class="site-header gutter">
      <a class="site-header__brand" routerLink="/">Greenadine</a>
      <nav class="inline-list" aria-label="Navigation principale">
        <a routerLink="/" fragment="infos">Infos</a>
        @if (session.user(); as user) {
          @if (session.isManager()) {
            <a routerLink="/gestion">Gestion</a>
          } @else {
            <a routerLink="/commandes">Mes commandes</a>
          }
          <span class="site-header__user">{{ user.firstName }}</span>
          <button type="button" class="link-button" (click)="logout()">Déconnexion</button>
        } @else {
          <a routerLink="/auth/connexion">Connexion</a>
        }
        <a class="btn btn--outline" routerLink="/commander">Commander</a>
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
