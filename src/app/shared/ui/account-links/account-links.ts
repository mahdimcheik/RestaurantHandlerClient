import { Component, inject, input, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../core/auth/session.service';

/**
 * Contenu du panneau Compte (barre du haut et onglet Compte du bas) : prénom, Mes commandes ou
 * Gestion, Déconnexion ; Connexion et Créer un compte pour un visiteur. `chosen` prévient le
 * panneau qu'il doit se fermer.
 */
@Component({
  selector: 'app-account-links',
  imports: [RouterLink],
  template: `
    @if (session.user(); as user) {
      <p class="topbar__who">{{ user.firstName }}</p>
      <ul class="topbar__links">
        @if (session.isManager()) {
          <li><a routerLink="/gestion" (click)="chosen.emit()">Gestion</a></li>
        } @else {
          <li><a routerLink="/commandes" (click)="chosen.emit()">Mes commandes</a></li>
          @if (withAbout()) {
            <li><a routerLink="/a-propos" (click)="chosen.emit()">À propos</a></li>
          }
        }
        <li>
          <button type="button" class="topbar__item" (click)="logout()">Déconnexion</button>
        </li>
      </ul>
    } @else {
      <ul class="topbar__links">
        <li><a routerLink="/auth/connexion" (click)="chosen.emit()">Connexion</a></li>
        <li><a routerLink="/auth/inscription" (click)="chosen.emit()">Créer un compte</a></li>
        @if (withAbout()) {
          <li><a routerLink="/a-propos" (click)="chosen.emit()">À propos</a></li>
        }
      </ul>
    }
  `,
})
export class AccountLinks {
  protected readonly session = inject(SessionService);
  private readonly router = inject(Router);

  /** Ajoute « À propos » (onglets du bas, où il n'a pas d'onglet pour le client). */
  readonly withAbout = input(false);
  readonly chosen = output();

  protected logout(): void {
    this.chosen.emit();
    this.session.logout().subscribe(() => void this.router.navigateByUrl('/'));
  }
}
