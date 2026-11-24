import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionService } from '../../../core/auth/session.service';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { ApprovalAlertService } from '../../services/approval-alert.service';
import { ConnectionBanner, ConnectionStatus } from '../connection-status/connection-status';
import { Icon, IconName } from '../icon/icon';
import { ServiceControl } from '../service-control/service-control';
import { PublicStore } from '../../services/public-store.service';

interface NavLink {
  path: string;
  icon: IconName;
  label: string;
  exact: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  links: readonly NavLink[];
}

/**
 * Coquille du back-office, au nouveau design (parfum 1) : menu à gauche par rubriques (icône et
 * texte, rail d'icônes sur petit écran ; seules les rubriques défilent, « Retour au site » et
 * « Déconnexion » restent en bas) et zone de contenu avec sa barre du haut. `.brand-ui`
 * fait prendre l'encre et le fond du parfum à toutes les pages de gestion. Rendue dans le <main>
 * de l'application (route `bare`), elle porte son propre lien d'évitement vers le contenu.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Icon,
    ServiceControl,
    ConnectionStatus,
    ConnectionBanner,
  ],
  host: {
    class: 'admin brand brand--1 brand-ui',
    '[style.--admin-bar-height.px]': 'barHeight()',
  },
  template: `
    <a class="skip-link" href="#contenu-gestion">Aller au contenu</a>
    <div class="waves" aria-hidden="true"></div>
    <nav class="admin__nav" aria-label="Back-office">
      <a class="admin__brand" routerLink="/gestion" [title]="name() + ' · Gestion'">
        <app-icon class="admin__brand-icon" name="dashboard" />
        <span class="admin__label admin__brand-text">
          <span class="admin__brand-name">{{ name() }}</span>
          <span class="admin__brand-sub">Gestion</span>
        </span>
      </a>
      <div class="admin__menu scrollbar-thin">
        @for (group of groups; track group.id) {
          <div class="admin__group">
            <p class="admin__group-title admin__label" [id]="'admin-group-' + group.id">
              {{ group.label }}
            </p>
            <ul class="admin__links" [attr.aria-labelledby]="'admin-group-' + group.id">
              @for (link of group.links; track link.path) {
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
                        >{{ toApprove() }} <span class="visually-hidden">à valider</span></span
                      >
                    }
                  </a>
                </li>
              }
            </ul>
          </div>
        }
      </div>
      <ul class="admin__links admin__links--end">
        <li>
          <a class="admin__link" routerLink="/" title="Retour au site">
            <app-icon name="site" />
            <span class="admin__label">Retour au site</span>
          </a>
        </li>
        <li>
          <button type="button" class="admin__link" title="Déconnexion" (click)="logout()">
            <app-icon name="logout" />
            <span class="admin__label">Déconnexion</span>
          </button>
        </li>
      </ul>
    </nav>
    <div class="admin__main">
      <div #bar class="admin__bar gutter">
        <app-service-control />
        <div class="admin__tools">
          <button
            type="button"
            class="icon-button"
            [attr.aria-pressed]="!approvals.muted()"
            title="Son des commandes à valider"
            (click)="approvals.toggleMuted()"
          >
            <app-icon [name]="approvals.muted() ? 'bellOff' : 'bell'" />
            <span class="visually-hidden">Son des commandes à valider</span>
          </button>
          <app-connection-status />
          <span class="admin__user">{{ session.user()?.firstName }}</span>
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
  private readonly store = inject(PublicStore);

  protected readonly name = computed(() => this.store.info.value()?.tradeName || 'Greenadine');

  protected readonly ordersPath = '/gestion/commandes';
  protected readonly toApprove = this.approvals.count;
  /** Annonce aux lecteurs d'écran, seulement quand le nombre à valider augmente. */
  protected readonly approvalNotice = linkedSignal<number, string>({
    source: this.toApprove,
    computation: (count, previous) =>
      previous && count > previous.source
        ? `Nouvelle commande à valider (${count} en attente).`
        : (previous?.value ?? ''),
  });

  /** Hauteur de la barre du haut, sous laquelle se collent les en-têtes de fiche. */
  protected readonly barHeight = signal(0);
  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');

  constructor() {
    this.watchBarHeight();
    this.store.info.load();
    inject(RealtimeService).start();
    this.approvals.start();
  }

  protected readonly groups: readonly NavGroup[] = [
    {
      id: 'service',
      label: 'Service',
      links: [
        { path: '/gestion', icon: 'dashboard', label: 'Tableau de bord', exact: true },
        { path: '/gestion/comptoir', icon: 'counter', label: 'Comptoir', exact: false },
        { path: '/gestion/commandes', icon: 'orders', label: 'Commandes', exact: false },
        { path: '/cuisine', icon: 'flame', label: 'Cuisine', exact: false },
        { path: '/gestion/statistiques', icon: 'chart', label: 'Statistiques', exact: false },
      ],
    },
    {
      id: 'carte',
      label: 'Carte',
      links: [
        { path: '/gestion/categories', icon: 'categories', label: 'Catégories', exact: false },
        { path: '/gestion/produits', icon: 'products', label: 'Produits', exact: false },
        { path: '/gestion/menus', icon: 'menus', label: 'Menus', exact: false },
        { path: '/gestion/ingredients', icon: 'ingredients', label: 'Ingrédients', exact: false },
        { path: '/gestion/options', icon: 'options', label: `Groupes d'options`, exact: false },
        { path: '/gestion/ruptures', icon: 'stock', label: 'Ruptures', exact: false },
      ],
    },
    {
      id: 'reglages',
      label: 'Réglages',
      links: [
        {
          path: '/gestion/ouverture',
          icon: 'clock',
          label: 'Horaires et fermetures',
          exact: false,
        },
        { path: '/gestion/restaurant', icon: 'store', label: 'Restaurant', exact: false },
        { path: '/gestion/utilisateurs', icon: 'users', label: 'Utilisateurs', exact: false },
      ],
    },
  ];

  /** La barre passe sur plusieurs lignes en écran étroit : sa hauteur est suivie. */
  private watchBarHeight(): void {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const element = this.bar().nativeElement;
      const observer = new ResizeObserver(() => this.barHeight.set(element.offsetHeight));
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected logout(): void {
    this.session.logout().subscribe(() => void this.router.navigateByUrl('/'));
  }
}
