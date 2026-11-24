import { Component, input, output } from '@angular/core';
import { Icon } from '../../../shared/ui/icon/icon';

/** Boutons « Monter » / « Descendre » d'un élément d'une liste ordonnée. */
@Component({
  selector: 'app-move-buttons',
  imports: [Icon],
  host: { class: 'move-buttons' },
  template: `
    <button
      type="button"
      class="icon-button"
      [disabled]="disabled() || first()"
      (click)="moved.emit(-1)"
      title="Monter « {{ name() }} »"
    >
      <app-icon name="up" />
    </button>
    <button
      type="button"
      class="icon-button"
      [disabled]="disabled() || last()"
      (click)="moved.emit(1)"
      title="Descendre « {{ name() }} »"
    >
      <app-icon name="down" />
    </button>
  `,
})
export class MoveButtons {
  readonly name = input.required<string>();
  readonly first = input(false);
  readonly last = input(false);
  readonly disabled = input(false);
  readonly moved = output<-1 | 1>();
}
