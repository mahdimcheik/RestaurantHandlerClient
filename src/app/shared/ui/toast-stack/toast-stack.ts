import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationCenter } from '../../services/notification-center.service';
import { Icon } from '../icon/icon';

/**
 * Toasts des notifications poussées par le serveur (« Commande n° 42 prête… »), en surimpression
 * sans décaler la page ; chacun disparaît seul et reste consultable dans la cloche.
 */
@Component({
  selector: 'app-toast-stack',
  imports: [RouterLink, Icon],
  template: `
    <div class="toast-stack" role="status" aria-live="polite">
      @for (toast of center.toasts(); track toast.id) {
        <div class="toast" [class.toast--ready]="toast.ready">
          <app-icon [name]="toast.ready ? 'bell' : 'orders'" />
          <p class="toast__message">{{ toast.message }}</p>
          @if (toast.link; as link) {
            <a class="toast__action" [routerLink]="link" (click)="open(toast.id)">Voir</a>
          }
          <button type="button" class="toast__close" (click)="center.dismiss(toast.id)">
            <app-icon name="remove" />
            <span class="visually-hidden">Fermer la notification</span>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastStack {
  protected readonly center = inject(NotificationCenter);

  protected open(id: string): void {
    this.center.markSeen(id);
    this.center.dismiss(id);
  }
}
