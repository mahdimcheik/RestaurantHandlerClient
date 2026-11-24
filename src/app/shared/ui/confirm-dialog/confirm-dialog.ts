import { Component, ElementRef, input, output, viewChild } from '@angular/core';

let nextId = 0;

/**
 * Confirmation d'une action lourde dans un `<dialog>` natif modal : le navigateur piège le
 * focus, Échap annule et le focus revient au déclencheur à la fermeture.
 */
@Component({
  selector: 'app-confirm-dialog',
  template: `
    <dialog
      #dialog
      class="dialog"
      [attr.aria-labelledby]="id + '-title'"
      [attr.aria-describedby]="id + '-text'"
    >
      <div class="dialog__body">
        <h2 [id]="id + '-title'">{{ title() }}</h2>
        <p [id]="id + '-text'"><ng-content /></p>
        <div class="form__actions">
          <button type="button" class="btn btn--danger" (click)="confirm()">
            {{ confirmLabel() }}
          </button>
          <button type="button" class="btn btn--outline" (click)="close()">Annuler</button>
        </div>
      </div>
    </dialog>
  `,
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly confirmed = output<void>();

  protected readonly id = `dialog-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(): void {
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected confirm(): void {
    this.close();
    this.confirmed.emit();
  }
}
