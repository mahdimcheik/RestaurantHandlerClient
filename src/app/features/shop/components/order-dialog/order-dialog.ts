import {
  afterRenderEffect,
  Component,
  contentChild,
  ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { Icon } from '../../../../shared/ui/icon/icon';

/**
 * Dialogue modal de la commande en ligne : centré sur grand écran, feuille montant du bas sur
 * téléphone. Titre facultatif projeté avec `#dialogTitle`, bouton Fermer, fermeture par Échap ou
 * par un clic hors du contenu. `open` suit l'état réel du dialogue ; `closed` n'est émis que si le
 * client le referme lui-même.
 */
@Component({
  selector: 'app-order-dialog',
  imports: [Icon],
  template: `
    <dialog
      #dialog
      class="dialog order-dialog brand brand--1 brand-ui"
      [class.order-dialog--cart]="variant() === 'cart'"
      [attr.aria-labelledby]="labelledBy()"
      (close)="dismiss()"
      (click)="onClick($event)"
    >
      <div class="order-dialog__body">
        <div class="order-dialog__bar" [class.order-dialog__bar--end]="!title()">
          <ng-content select="[dialogTitle]" />
          <button type="button" class="order-dialog__close" (click)="dismiss()">
            <app-icon name="remove" />
            <span class="visually-hidden">Fermer</span>
          </button>
        </div>
        <ng-content />
      </div>
    </dialog>
  `,
})
export class OrderDialog {
  readonly open = model(false);
  /** Identifiant de l'élément qui nomme le dialogue (titre projeté ou titre de la fiche). */
  readonly labelledBy = input.required<string>();
  readonly variant = input<'sheet' | 'cart'>('sheet');
  readonly closed = output<void>();

  protected readonly title = contentChild('dialogTitle');
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterRenderEffect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) {
        this.show(dialog);
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  /**
   * Un dialogue posé dans un autre (assistant d'options dans la fiche) attend que celui-ci soit
   * ouvert : ouvert avant lui, il passerait dessous dans la pile des dialogues modaux.
   */
  private show(dialog: HTMLDialogElement): void {
    const host = dialog.parentElement?.closest('dialog');
    if (host && !host.open) {
      setTimeout(() => {
        if (this.open() && !dialog.open && dialog.isConnected) {
          this.show(dialog);
        }
      });
      return;
    }
    dialog.showModal();
  }

  /** Fermeture par le client (Échap, bouton Fermer, clic hors du contenu). */
  protected dismiss(): void {
    if (this.open()) {
      this.open.set(false);
      this.closed.emit();
    }
  }

  /** Un clic sur le fond du dialogue (hors de son contenu) le referme. */
  protected onClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.dismiss();
    }
  }
}
