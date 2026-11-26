import { NgOptimizedImage } from '@angular/common';
import { Component, computed, ElementRef, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../../../core/auth/session.service';
import { ThemePreference, ThemeService } from '../../../core/theme/theme.service';
import { NotificationDetails } from '../../../core/api/generated';
import { NotificationCenter } from '../../services/notification-center.service';
import { PublicStore } from '../../services/public-store.service';
import { formatDateTime } from '../../utils/restaurant-time';
import { Icon, IconName } from '../icon/icon';

/** Choix du thème masqué pour l'instant : l'application suit le thème de l'appareil. */
const SHOW_THEME_MENU = false;

type MenuName = 'nav' | 'notifications' | 'account' | 'theme';

const THEMES: readonly { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'system', label: 'Système', icon: 'monitor' },
  { value: 'light', label: 'Clair', icon: 'sun' },
  { value: 'dark', label: 'Sombre', icon: 'moon' },
];

/**
 * Barre du haut du nouveau design. À gauche le logo du restaurant, au milieu la navigation
 * (repliée dans un bouton Menu sur écran étroit), à droite Commander, le panier, la cloche des
 * notifications (client connecté), le compte et le thème. Posée par-dessus un bloc plein écran, elle en reprend l'encre (`--brand-ink`).
 */
@Component({
  selector: 'app-site-topbar',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, Icon],
  host: {
    '(document:keydown.escape)': 'closeAndFocus()',
    '(document:click)': 'closeIfOutside($event)',
  },
  template: `
    <header class="topbar">
      <div class="topbar__start">
        <a class="topbar__brand" routerLink="/">
          @if (logoUrl(); as logo) {
            <img class="topbar__logo" [ngSrc]="logo" fill [alt]="name()" />
          } @else {
            {{ name() }}
          }
        </a>
        <div class="topbar__menu topbar__menu--nav">
          <button
            type="button"
            class="topbar__btn"
            aria-controls="topbar-nav"
            [attr.aria-expanded]="open() === 'nav'"
            (click)="toggle('nav', $event)"
          >
            <app-icon name="menu" />
            <span class="visually-hidden">Menu</span>
          </button>
          @if (open() === 'nav') {
            <ul id="topbar-nav" class="topbar__panel topbar__links">
              <li><a routerLink="/" (click)="close()">Accueil</a></li>
              <li><a routerLink="/carte" (click)="close()">Carte</a></li>
              <li>
                <a routerLink="/a-propos" (click)="close()">À propos</a>
              </li>
              @if (!session.isManager()) {
                <li>
                  <a routerLink="/commander" (click)="close()">Commander</a>
                </li>
              }
            </ul>
          }
        </div>
      </div>

      <nav class="topbar__nav" aria-label="Navigation principale">
        <a
          class="topbar__link"
          routerLink="/"
          routerLinkActive="topbar__link--active"
          [routerLinkActiveOptions]="{ exact: true }"
          ariaCurrentWhenActive="page"
          >Accueil</a
        >
        <a
          class="topbar__link"
          routerLink="/carte"
          routerLinkActive="topbar__link--active"
          ariaCurrentWhenActive="page"
          >Carte</a
        >
        <a
          class="topbar__link"
          routerLink="/a-propos"
          routerLinkActive="topbar__link--active"
          ariaCurrentWhenActive="page"
          >À propos</a
        >
      </nav>

      <div class="topbar__end">
        @if (!session.isManager()) {
          <a class="topbar__btn topbar__btn--text" routerLink="/commander">Commander</a>
          <a class="topbar__btn" routerLink="/panier" aria-label="Panier">
            <app-icon name="cart" />
          </a>
        }

        @if (notifications.enabled()) {
          <div class="topbar__menu">
            <button
              type="button"
              class="topbar__btn topbar__bell"
              aria-controls="topbar-notifications"
              [attr.aria-expanded]="open() === 'notifications'"
              (click)="toggle('notifications', $event)"
            >
              <app-icon name="bell" />
              @if (notifications.unread(); as unread) {
                <span class="topbar__badge" aria-hidden="true">{{
                  unread > 9 ? '9+' : unread
                }}</span>
              }
              <span class="visually-hidden">{{ bellLabel() }}</span>
            </button>
            @if (open() === 'notifications') {
              <div id="topbar-notifications" class="topbar__panel topbar__panel--end notif-panel">
                <div class="notif-panel__head">
                  <p class="notif-panel__title">Notifications</p>
                  @if (notifications.unread()) {
                    <button
                      type="button"
                      class="notif-panel__all"
                      (click)="notifications.markAllSeen()"
                    >
                      Tout marquer comme lu
                    </button>
                  }
                </div>
                @if (notifications.items().length) {
                  <ul class="notif-list">
                    @for (item of notifications.items(); track item.id) {
                      <li>
                        <a
                          class="notif-list__item"
                          [class.notif-list__item--unread]="!item.isSeen"
                          [routerLink]="item.link || '/commandes'"
                          (click)="openNotification(item)"
                        >
                          <span class="notif-list__message">
                            @if (!item.isSeen) {
                              <span class="visually-hidden">Non lue : </span>
                            }
                            {{ item.message }}
                          </span>
                          @if (item.createdAt) {
                            <time class="notif-list__time" [attr.datetime]="item.createdAt">{{
                              when(item.createdAt)
                            }}</time>
                          }
                        </a>
                      </li>
                    }
                  </ul>
                } @else {
                  <p class="notif-panel__empty">Aucune notification.</p>
                }
                <a class="notif-panel__orders" routerLink="/commandes" (click)="close()"
                  >Mes commandes</a
                >
              </div>
            }
          </div>
        }

        <div class="topbar__menu">
          <button
            type="button"
            class="topbar__btn"
            aria-controls="topbar-account"
            [attr.aria-expanded]="open() === 'account'"
            (click)="toggle('account', $event)"
          >
            <app-icon name="user" />
            <span class="visually-hidden">Compte</span>
          </button>
          @if (open() === 'account') {
            <div id="topbar-account" class="topbar__panel topbar__panel--end">
              @if (session.user(); as user) {
                <p class="topbar__who">{{ user.firstName }}</p>
                <ul class="topbar__links">
                  @if (session.isManager()) {
                    <li>
                      <a routerLink="/gestion" (click)="close()">Gestion</a>
                    </li>
                  } @else {
                    <li>
                      <a routerLink="/commandes" (click)="close()">Mes commandes</a>
                    </li>
                  }
                  <li>
                    <button type="button" class="topbar__item" (click)="logout()">
                      Déconnexion
                    </button>
                  </li>
                </ul>
              } @else {
                <ul class="topbar__links">
                  <li>
                    <a routerLink="/auth/connexion" (click)="close()">Connexion</a>
                  </li>
                  <li>
                    <a routerLink="/auth/inscription" (click)="close()">Créer un compte</a>
                  </li>
                </ul>
              }
            </div>
          }
        </div>

        @if (showThemeMenu) {
          <div class="topbar__menu">
            <button
              type="button"
              class="topbar__btn"
              aria-controls="topbar-theme"
              [attr.aria-expanded]="open() === 'theme'"
              (click)="toggle('theme', $event)"
            >
              <app-icon [name]="currentTheme().icon" />
              <span class="visually-hidden">Thème : {{ currentTheme().label }}</span>
            </button>
            @if (open() === 'theme') {
              <ul id="topbar-theme" class="topbar__panel topbar__panel--end topbar__links">
                @for (option of themes; track option.value) {
                  <li>
                    <button
                      type="button"
                      class="topbar__item"
                      [attr.aria-pressed]="theme.preference() === option.value"
                      (click)="chooseTheme(option.value)"
                    >
                      <app-icon [name]="option.icon" />
                      {{ option.label }}
                    </button>
                  </li>
                }
              </ul>
            }
          </div>
        }
      </div>
    </header>
  `,
})
export class SiteTopbar {
  protected readonly session = inject(SessionService);
  protected readonly notifications = inject(NotificationCenter);
  protected readonly theme = inject(ThemeService);
  private readonly store = inject(PublicStore);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly themes = THEMES;
  protected readonly showThemeMenu = SHOW_THEME_MENU;
  protected readonly open = signal<MenuName | null>(null);
  /** Bouton qui a ouvert le panneau, pour lui rendre le focus à la fermeture par Échap. */
  private trigger: HTMLElement | null = null;

  protected readonly name = computed(() => this.store.info.value()?.tradeName || 'Greenadine');
  protected readonly logoUrl = computed(() => this.store.info.value()?.logoUrl ?? null);
  protected readonly currentTheme = computed(
    () => THEMES.find((option) => option.value === this.theme.preference()) ?? THEMES[0],
  );

  protected readonly bellLabel = computed(() => {
    const unread = this.notifications.unread();
    if (!unread) {
      return 'Notifications';
    }
    return unread === 1 ? 'Notifications, 1 non lue' : `Notifications, ${unread} non lues`;
  });
  protected readonly when = formatDateTime;

  constructor() {
    this.store.info.load();
  }

  protected openNotification(item: NotificationDetails): void {
    if (item.id) {
      this.notifications.markSeen(item.id);
    }
    this.close();
  }

  protected toggle(menu: MenuName, event: MouseEvent): void {
    this.trigger = event.currentTarget as HTMLElement;
    this.open.update((open) => (open === menu ? null : menu));
  }

  protected close(): void {
    this.open.set(null);
  }

  protected closeAndFocus(): void {
    if (this.open()) {
      this.open.set(null);
      this.trigger?.focus();
    }
  }

  protected closeIfOutside(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(null);
    }
  }

  protected chooseTheme(preference: ThemePreference): void {
    this.theme.set(preference);
    this.close();
  }

  protected logout(): void {
    this.close();
    this.session.logout().subscribe(() => void this.router.navigateByUrl('/'));
  }
}
