import { Component, ElementRef, input, output, viewChild } from '@angular/core';

let nextId = 0;

/**
 * Dialogue modal générique (`<dialog>` natif) : titre et contenu projeté. Le navigateur piège le
 * focus, Échap ferme et le focus revient au déclencheur à la fermeture.
 */
@Component({
  selector: 'app-modal-dialog',
  template: `
    <dialog
      #dialog
      class="dialog"
      [class.dialog--wide]="wide()"
      [attr.aria-labelledby]="id + '-title'"
      (close)="closed.emit()"
    >
      <div class="dialog__body">
        <h2 [id]="id + '-title'">{{ title() }}</h2>
        <ng-content />
      </div>
    </dialog>
  `,
})
export class ModalDialog {
  readonly title = input.required<string>();
  readonly wide = input(false);
  /** Fermeture, quelle qu'en soit la cause (bouton, Échap). */
  readonly closed = output<void>();

  protected readonly id = `modal-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(): void {
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }
}
