import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { form, submit } from '@angular/forms/signals';
import { focusFirstInvalid, lengthRule, requiredRule } from '../../../shared/forms/validation';
import { TextareaField } from '../../../shared/ui/textarea-field/textarea-field';

let nextId = 0;

/** Action lourde qui exige un motif (refus, annulation) dans un `<dialog>` natif modal. */
@Component({
  selector: 'app-reason-dialog',
  imports: [TextareaField],
  template: `
    <dialog #dialog class="dialog" [attr.aria-labelledby]="id + '-title'">
      <form class="dialog__body" novalidate (submit)="confirm($event)">
        <h2 [id]="id + '-title'">{{ title() }}</h2>
        <p><ng-content /></p>
        <app-textarea-field [field]="form.reason" [label]="reasonLabel" />
        <div class="form__actions">
          <button type="submit" class="btn btn--danger">{{ confirmLabel() }}</button>
          <button type="button" class="btn btn--outline" (click)="close()" i18n="@@dialog.cancel">
            Annuler
          </button>
        </div>
      </form>
    </dialog>
  `,
})
export class ReasonDialog {
  readonly title = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly confirmed = output<string>();

  protected readonly id = `reason-${nextId++}`;
  protected readonly reasonLabel = $localize`:@@order.reason:Motif (communiqué au client)`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly model = signal({ reason: '' });
  protected readonly form = form(this.model, (path) => {
    requiredRule(path.reason);
    lengthRule(path.reason, 500);
  });

  open(): void {
    this.model.set({ reason: '' });
    this.form().reset();
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected async confirm(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.form, {
      action: async () => {
        this.close();
        this.confirmed.emit(this.model().reason.trim());
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }
}
