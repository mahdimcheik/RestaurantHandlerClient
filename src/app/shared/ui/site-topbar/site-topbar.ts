import { NgOptimizedImage } from '@angular/common';
import { Component, computed, ElementRef, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../../../core/auth/session.service';
import { ThemePreference, ThemeService } from '../../../core/theme/theme.service';
import { PublicStore } from '../../services/public-store.service';
import { Icon, IconName } from '../icon/icon';

type MenuName = 'nav' | 'account' | 'theme';

const THEMES: readonly { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'system', label: $localize`:@@theme.system:Système`, icon: 'monitor' },
  { value: 'light', label: $localize`:@@theme.light:Clair`, icon: 'sun' },
  { value: 'dark', label: $localize`:@@theme.dark:Sombre`, icon: 'moon' },
];

/**
 * Barre du haut du nouveau design. À gauche le logo du restaurant, au milieu la navigation
 * (repliée dans un bouton Menu sur écran étroit), à droite Commander, le panier, le compte et le
 * thème. Posée par-dessus un bloc plein écran, elle en reprend l'encre (`--brand-ink`).
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
            <span class="visually-hidden" i18n="@@topbar.menu">Menu</span>
          </button>
          @if (open() === 'nav') {
            <ul id="topbar-nav" class="topbar__panel topbar__links">
              <li><a routerLink="/" (click)="close()" i18n="@@topbar.home">Accueil</a></li>
              <li><a routerLink="/commander" (click)="close()" i18n="@@topbar.card">Carte</a></li>
              <li>
                <a routerLink="/a-propos" (click)="close()" i18n="@@topbar.about">À propos</a>
              </li>
              <li>
                <a routerLink="/commander" (click)="close()" i18n="@@header.order">Commander</a>
              </li>
            </ul>
          }
        </div>
      </div>

      <nav class="topbar__nav" aria-label="Navigation principale" i18n-aria-label="@@nav.label">
        <a
          class="topbar__link"
          routerLink="/"
          routerLinkActive="topbar__link--active"
          [routerLinkActiveOptions]="{ exact: true }"
          ariaCurrentWhenActive="page"
          i18n="@@topbar.home"
          >Accueil</a
        >
        <a
          class="topbar__link"
          routerLink="/commander"
          routerLinkActive="topbar__link--active"
          ariaCurrentWhenActive="page"
          i18n="@@topbar.card"
          >Carte</a
        >
        <a
          class="topbar__link"
          routerLink="/a-propos"
          routerLinkActive="topbar__link--active"
          ariaCurrentWhenActive="page"
          i18n="@@topbar.about"
          >À propos</a
        >
      </nav>

      <div class="topbar__end">
        <a class="topbar__btn topbar__btn--text" routerLink="/commander" i18n="@@header.order"
          >Commander</a
        >
        <a
          class="topbar__btn"
          routerLink="/panier"
          aria-label="Panier"
          i18n-aria-label="@@topbar.cart"
        >
          <app-icon name="cart" />
        </a>

        <div class="topbar__menu">
          <button
            type="button"
            class="topbar__btn"
            aria-controls="topbar-account"
            [attr.aria-expanded]="open() === 'account'"
            (click)="toggle('account', $event)"
          >
            <app-icon name="user" />
            <span class="visually-hidden" i18n="@@topbar.account">Compte</span>
          </button>
          @if (open() === 'account') {
            <div id="topbar-account" class="topbar__panel topbar__panel--end">
              @if (session.user(); as user) {
                <p class="topbar__who">{{ user.firstName }}</p>
                <ul class="topbar__links">
                  @if (session.isManager()) {
                    <li>
                      <a routerLink="/gestion" (click)="close()" i18n="@@nav.admin">Gestion</a>
                    </li>
                  } @else {
                    <li>
                      <a routerLink="/commandes" (click)="close()" i18n="@@nav.myOrders"
                        >Mes commandes</a
                      >
                    </li>
                  }
                  <li>
                    <button
                      type="button"
                      class="topbar__item"
                      (click)="logout()"
                      i18n="@@nav.logout"
                    >
                      Déconnexion
                    </button>
                  </li>
                </ul>
              } @else {
                <ul class="topbar__links">
                  <li>
                    <a routerLink="/auth/connexion" (click)="close()" i18n="@@nav.login"
                      >Connexion</a
                    >
                  </li>
                  <li>
                    <a routerLink="/auth/inscription" (click)="close()" i18n="@@topbar.register"
                      >Créer un compte</a
                    >
                  </li>
                </ul>
              }
            </div>
          }
        </div>

        <div class="topbar__menu">
          <button
            type="button"
            class="topbar__btn"
            aria-controls="topbar-theme"
            [attr.aria-expanded]="open() === 'theme'"
            (click)="toggle('theme', $event)"
          >
            <app-icon [name]="currentTheme().icon" />
            <span class="visually-hidden" i18n="@@topbar.theme"
              >Thème : {{ currentTheme().label }}</span
            >
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
      </div>
    </header>
  `,
})
export class SiteTopbar {
  protected readonly session = inject(SessionService);
  protected readonly theme = inject(ThemeService);
  private readonly store = inject(PublicStore);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly themes = THEMES;
  protected readonly open = signal<MenuName | null>(null);
  /** Bouton qui a ouvert le panneau, pour lui rendre le focus à la fermeture par Échap. */
  private trigger: HTMLElement | null = null;

  protected readonly name = computed(
    () => this.store.info.value()?.tradeName || $localize`:@@brand:Greenadine`,
  );
  protected readonly logoUrl = computed(() => this.store.info.value()?.logoUrl ?? null);
  protected readonly currentTheme = computed(
    () => THEMES.find((option) => option.value === this.theme.preference()) ?? THEMES[0],
  );

  constructor() {
    this.store.info.load();
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
