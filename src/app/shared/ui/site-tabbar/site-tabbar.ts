import { Component, ElementRef, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../../../core/auth/session.service';
import { TabBarState } from '../../services/tab-bar.service';
import { AccountLinks } from '../account-links/account-links';
import { Icon } from '../icon/icon';

/**
 * Barre d'onglets fixée en bas sur téléphone et tablette (≤ 64rem), à portée du pouce : Accueil,
 * Carte, Commander, Panier et Compte (À propos et Gestion à la place de Commander et Panier pour
 * le Manager). Posée dans la coquille, affichée quand la page la demande (`TabBarState`).
 */
@Component({
  selector: 'app-site-tabbar',
  imports: [RouterLink, RouterLinkActive, Icon, AccountLinks],
  host: {
    '(document:keydown.escape)': 'closeAndFocus()',
    '(document:click)': 'closeIfOutside($event)',
  },
  template: `
    @if (state.visible()) {
      <nav class="tabbar" aria-label="Navigation">
        <a
          class="tabbar__item"
          routerLink="/"
          routerLinkActive="tabbar__item--active"
          [routerLinkActiveOptions]="{ exact: true }"
          ariaCurrentWhenActive="page"
          ><app-icon name="site" /><span class="tabbar__label">Accueil</span></a
        >
        <a
          class="tabbar__item"
          routerLink="/carte"
          routerLinkActive="tabbar__item--active"
          ariaCurrentWhenActive="page"
          ><app-icon name="menus" /><span class="tabbar__label">Carte</span></a
        >
        @if (session.isManager()) {
          <a
            class="tabbar__item"
            routerLink="/a-propos"
            routerLinkActive="tabbar__item--active"
            ariaCurrentWhenActive="page"
            ><app-icon name="info" /><span class="tabbar__label">À propos</span></a
          >
          <a class="tabbar__item" routerLink="/gestion"
            ><app-icon name="dashboard" /><span class="tabbar__label">Gestion</span></a
          >
        } @else {
          <a
            class="tabbar__item"
            routerLink="/commander"
            routerLinkActive="tabbar__item--active"
            ariaCurrentWhenActive="page"
            ><app-icon name="bag" /><span class="tabbar__label">Commander</span></a
          >
          <a
            class="tabbar__item"
            routerLink="/panier"
            routerLinkActive="tabbar__item--active"
            ariaCurrentWhenActive="page"
            ><app-icon name="cart" /><span class="tabbar__label">Panier</span></a
          >
        }
        <button
          type="button"
          class="tabbar__item"
          aria-controls="tabbar-account"
          [attr.aria-expanded]="open()"
          (click)="toggle($event)"
        >
          <app-icon name="user" /><span class="tabbar__label">Compte</span>
        </button>
        @if (open()) {
          <div id="tabbar-account" class="topbar__panel tabbar__panel">
            <app-account-links [withAbout]="true" (chosen)="open.set(false)" />
          </div>
        }
      </nav>
    }
  `,
})
export class SiteTabbar {
  protected readonly state = inject(TabBarState);
  protected readonly session = inject(SessionService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly open = signal(false);
  private trigger: HTMLElement | null = null;

  protected toggle(event: MouseEvent): void {
    this.trigger = event.currentTarget as HTMLElement;
    this.open.update((open) => !open);
  }

  protected closeAndFocus(): void {
    if (this.open()) {
      this.open.set(false);
      this.trigger?.focus();
    }
  }

  protected closeIfOutside(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
