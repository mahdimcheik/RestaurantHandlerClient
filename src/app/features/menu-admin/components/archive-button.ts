import { Component, input, output, viewChild } from '@angular/core';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../../shared/ui/icon/icon';

/** Bouton « Archiver » et sa confirmation : l'archivage est définitif. */
@Component({
  selector: 'app-archive-button',
  imports: [ConfirmDialog, Icon],
  template: `
    <button type="button" class="btn btn--danger btn--icon" [disabled]="busy()" (click)="ask()">
      <app-icon name="archive" />
      <span>Archiver</span>
    </button>
    <app-confirm-dialog
      title="Archiver « {{ name() }} » ?"
      confirmLabel="Archiver définitivement"
      (confirmed)="confirmed.emit()"
    >
      L'élément disparaît de la carte et ne pourra plus être modifié ni restauré. Les commandes
      passées le conservent.
    </app-confirm-dialog>
  `,
})
export class ArchiveButton {
  readonly name = input.required<string>();
  readonly busy = input(false);
  readonly confirmed = output<void>();

  private readonly dialog = viewChild.required(ConfirmDialog);

  protected ask(): void {
    this.dialog().open();
  }
}
