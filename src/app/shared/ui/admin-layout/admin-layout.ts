import { Component, inject, linkedSignal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionService } from '../../../core/auth/session.service';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { ApprovalAlertService } from '../../services/approval-alert.service';
import { ConnectionBanner, ConnectionStatus } from '../connection-status/connection-status';
import { Icon, IconName } from '../icon/icon';
import { ServiceControl } from '../service-control/service-control';
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
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Icon,
    ThemeSwitcher,
    ServiceControl,
    ConnectionStatus,
    ConnectionBanner,
  ],
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
              @if (link.path === ordersPath && toApprove() > 0) {
                {{ ' '
                }}<span class="admin__count"
                  >{{ toApprove() }}
                  <span class="visually-hidden" i18n="@@admin.toApprove">à valider</span></span
                >
              }
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
        <app-service-control />
        <div class="admin__tools">
          <button
            type="button"
            class="icon-button"
            [attr.aria-pressed]="!approvals.muted()"
            title="Son des commandes à valider"
            i18n-title="@@admin.approvalSound"
            (click)="approvals.toggleMuted()"
          >
            <app-icon [name]="approvals.muted() ? 'bellOff' : 'bell'" />
            <span class="visually-hidden" i18n="@@admin.approvalSound"
              >Son des commandes à valider</span
            >
          </button>
          <app-connection-status />
          <span class="admin__user">{{ session.user()?.firstName }}</span>
          <app-theme-switcher />
        </div>
      </div>
      <div id="contenu-gestion" class="admin__content gutter" tabindex="-1">
        <app-connection-banner />
        <p class="visually-hidden" aria-live="polite">{{ approvalNotice() }}</p>
        <router-outlet />
      </div>
    </div>
  `,
})
export class AdminLayout {
  protected readonly session = inject(SessionService);
  protected readonly approvals = inject(ApprovalAlertService);
  private readonly router = inject(Router);

  protected readonly ordersPath = '/gestion/commandes';
  protected readonly toApprove = this.approvals.count;
  /** Annonce aux lecteurs d'écran, seulement quand le nombre à valider augmente. */
  protected readonly approvalNotice = linkedSignal<number, string>({
    source: this.toApprove,
    computation: (count, previous) =>
      previous && count > previous.source
        ? $localize`:@@admin.newToApprove:Nouvelle commande à valider (${count}:count: en attente).`
        : (previous?.value ?? ''),
  });

  constructor() {
    inject(RealtimeService).start();
    this.approvals.start();
  }

  protected readonly links: readonly NavLink[] = [
    {
      path: '/gestion',
      icon: 'dashboard',
      label: $localize`:@@admin.dashboard:Tableau de bord`,
      exact: true,
    },
    {
      path: '/gestion/comptoir',
      icon: 'counter',
      label: $localize`:@@admin.counter:Comptoir`,
      exact: false,
    },
    {
      path: '/gestion/commandes',
      icon: 'orders',
      label: $localize`:@@admin.orders:Commandes`,
      exact: false,
    },
    {
      path: '/cuisine',
      icon: 'flame',
      label: $localize`:@@admin.kitchen:Cuisine`,
      exact: false,
    },
    {
      path: '/gestion/statistiques',
      icon: 'chart',
      label: $localize`:@@admin.stats:Statistiques`,
      exact: false,
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
      path: '/gestion/menus',
      icon: 'menus',
      label: $localize`:@@admin.menus:Menus`,
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
    {
      path: '/gestion/ruptures',
      icon: 'stock',
      label: $localize`:@@admin.stock:Ruptures`,
      exact: false,
    },
    {
      path: '/gestion/ouverture',
      icon: 'clock',
      label: $localize`:@@admin.opening:Horaires et fermetures`,
      exact: false,
    },
    {
      path: '/gestion/restaurant',
      icon: 'store',
      label: $localize`:@@admin.restaurant:Restaurant`,
      exact: false,
    },
    {
      path: '/gestion/utilisateurs',
      icon: 'users',
      label: $localize`:@@admin.users:Utilisateurs`,
      exact: false,
    },
  ];

  protected logout(): void {
    this.session.logout().subscribe(() => void this.router.navigateByUrl('/'));
  }
}
