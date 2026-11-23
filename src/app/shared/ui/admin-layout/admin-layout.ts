import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionService } from '../../../core/auth/session.service';
import { Icon, IconName } from '../icon/icon';
import { ThemeSwitcher } from '../theme-switcher/theme-switcher';

interface NavLink {
  path: string;
  icon: IconName;
  label: string;
  exact: boolean;
}

/**
 * Coquille du back-office : menu à gauche (icône et texte, rail d'icônes sur petit écran)
 * et zone de contenu avec sa barre du haut. Rendue dans le <main> de l'application (route
 * `bare`), elle porte son propre lien d'évitement vers le contenu.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, ThemeSwitcher],
  host: { class: 'admin' },
  template: `
    <a class="skip-link" href="#contenu-gestion" i18n="@@skipToContent">Aller au contenu</a>
    <nav class="admin__nav" aria-label="Back-office" i18n-aria-label="@@admin.nav">
      <a class="admin__brand" routerLink="/gestion" title="Gestion" i18n-title="@@admin.brand">
        <app-icon name="dashboard" />
        <span class="admin__label" i18n="@@admin.brand">Gestion</span>
      </a>
      <ul class="admin__links">
        @for (link of links; track link.path) {
          <li>
            <a
              class="admin__link"
              [routerLink]="link.path"
              routerLinkActive
              ariaCurrentWhenActive="page"
              [routerLinkActiveOptions]="{ exact: link.exact }"
              [title]="link.label"
            >
              <app-icon [name]="link.icon" />
              <span class="admin__label">{{ link.label }}</span>
            </a>
          </li>
        }
      </ul>
      <ul class="admin__links admin__links--end">
        <li>
          <a class="admin__link" routerLink="/" title="Retour au site" i18n-title="@@admin.site">
            <app-icon name="site" />
            <span class="admin__label" i18n="@@admin.site">Retour au site</span>
          </a>
        </li>
        <li>
          <button
            type="button"
            class="admin__link"
            title="Déconnexion"
            i18n-title="@@nav.logout"
            (click)="logout()"
          >
            <app-icon name="logout" />
            <span class="admin__label" i18n="@@nav.logout">Déconnexion</span>
          </button>
        </li>
      </ul>
    </nav>
    <div class="admin__main">
      <div class="admin__bar gutter">
        <span class="admin__user">{{ session.user()?.firstName }}</span>
        <app-theme-switcher />
      </div>
      <div id="contenu-gestion" class="admin__content gutter" tabindex="-1">
        <router-outlet />
      </div>
    </div>
  `,
})
export class AdminLayout {
  protected readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly links: readonly NavLink[] = [
    {
      path: '/gestion',
      icon: 'dashboard',
      label: $localize`:@@admin.dashboard:Tableau de bord`,
      exact: true,
    },
    {
      path: '/gestion/categories',
      icon: 'categories',
      label: $localize`:@@admin.categories:Catégories`,
      exact: false,
    },
    {
      path: '/gestion/produits',
      icon: 'products',
      label: $localize`:@@admin.products:Produits`,
      exact: false,
    },
    {
      path: '/gestion/ingredients',
      icon: 'ingredients',
      label: $localize`:@@admin.ingredients:Ingrédients`,
      exact: false,
    },
    {
      path: '/gestion/options',
      icon: 'options',
      label: $localize`:@@admin.options:Groupes d'options`,
      exact: false,
    },
  ];

  protected logout(): void {
    this.session.logout().subscribe(() => void this.router.navigateByUrl('/'));
  }
}
