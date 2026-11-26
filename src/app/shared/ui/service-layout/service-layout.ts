import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { PublicStore } from '../../services/public-store.service';
import { ConnectionBanner, ConnectionStatus } from '../connection-status/connection-status';
import { Icon, IconName } from '../icon/icon';
import { ServiceControl } from '../service-control/service-control';

interface ServiceTab {
  path: string;
  icon: IconName;
  label: string;
}

/**
 * Coquille des écrans de service (cuisine, commandes), pensée pour une tablette tactile en
 * paysage : pas de menu à gauche, une barre du haut à grandes touches, l'état d'ouverture, la
 * connexion et le retour à la gestion (le thème
 * suit l'appareil ; il se force depuis le site). Rendue
 * dans le <main> de l'application (route `bare`), elle porte son propre lien d'évitement.
 */
@Component({
  selector: 'app-service-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Icon,
    ServiceControl,
    ConnectionStatus,
    ConnectionBanner,
  ],
  host: { class: 'service-shell brand brand-ui' },
  template: `
    <a class="skip-link" href="#contenu-service">Aller au contenu</a>
    <header class="service-shell__bar">
      <p class="service-shell__name">{{ name() }}</p>
      <nav class="service-shell__nav" aria-label="Service">
        @for (tab of tabs; track tab.path) {
          <a
            class="service-shell__tab"
            [routerLink]="tab.path"
            routerLinkActive
            ariaCurrentWhenActive="page"
          >
            <app-icon [name]="tab.icon" />
            <span>{{ tab.label }}</span>
          </a>
        }
      </nav>
      <div class="service-shell__tools">
        <app-service-control />
        <app-connection-status />
        <a class="btn btn--outline btn--icon" routerLink="/gestion">
          <app-icon name="dashboard" />
          <span>Gestion</span>
        </a>
      </div>
    </header>
    <div id="contenu-service" class="service-shell__content" tabindex="-1">
      <div class="service-shell__alerts gutter">
        <app-connection-banner />
      </div>
      <router-outlet />
    </div>
  `,
})
export class ServiceLayout {
  private readonly store = inject(PublicStore);

  protected readonly name = computed(() => this.store.info.value()?.tradeName || 'Greenadine');

  protected readonly tabs: readonly ServiceTab[] = [
    { path: '/service/cuisine', icon: 'flame', label: 'Cuisine' },
    { path: '/service/commandes', icon: 'orders', label: 'Commandes' },
  ];

  constructor() {
    this.store.info.load();
    inject(RealtimeService).start();
  }
}
