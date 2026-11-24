import {
  Component,
  effect,
  ElementRef,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { form, submit } from '@angular/forms/signals';
import { eurosRule, focusFirstInvalid, nameRules } from '../../../shared/forms/validation';
import { SelectField, SelectOption } from '../../../shared/ui/select-field/select-field';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { centsToInput, parseEuros } from '../../../shared/utils/money';

/** Choix saisi dans le dialogue, pas encore enregistré. */
export interface NewChoice {
  name: string;
  extraPrice: string;
  ingredientId: string;
}

const empty = (): NewChoice => ({ name: '', extraPrice: '0,00', ingredientId: '' });

let nextId = 0;

/**
 * Ajout d'un choix à un groupe d'options dans un `<dialog>` natif modal. Le choix rejoint la
 * liste de la fiche ; il n'est envoyé à l'API qu'à l'enregistrement du groupe.
 */
@Component({
  selector: 'app-choice-add-dialog',
  imports: [TextField, SelectField],
  template: `
    <dialog #dialog class="dialog" [attr.aria-labelledby]="id + '-title'">
      <form class="dialog__body" novalidate (submit)="onSubmit($event)">
        <h2 [id]="id + '-title'">Ajouter un choix</h2>
        <div class="form">
          <app-text-field [field]="form.name" label="Nom" />
          <app-text-field [field]="form.extraPrice" inputmode="decimal" label="Surcoût (€)" />
          <app-select-field
            [field]="form.ingredientId"
            [options]="ingredientOptions()"
            label="Ingrédient lié"
            placeholder="Aucun"
            hint="Grise le choix quand l'ingrédient est en rupture"
          />
        </div>
        <div class="form__actions">
          <button type="submit" class="btn">Ajouter</button>
          <button type="button" class="btn btn--outline" (click)="close()">Annuler</button>
        </div>
      </form>
    </dialog>
  `,
})
export class ChoiceAddDialog {
  readonly ingredientOptions = input<SelectOption[]>([]);
  /** Prix de référence de chaque ingrédient, en centimes. */
  readonly ingredientPrices = input(new Map<string, number>());
  readonly added = output<NewChoice>();

  protected readonly id = `choice-dialog-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly model = signal(empty());
  protected readonly form = form(this.model, (path) => {
    nameRules(path.name);
    eurosRule(path.extraPrice, { required: true });
  });

  constructor() {
    this.prefillPrice();
  }

  open(): void {
    this.form().reset(empty());
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.form, {
      action: async () => {
        const { name, extraPrice, ingredientId } = this.model();
        this.added.emit({ name: name.trim(), extraPrice, ingredientId });
        this.close();
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }

  /** Un ingrédient choisi alors que le surcoût vaut 0 € lui donne son prix de référence. */
  private prefillPrice(): void {
    let previous = '';
    effect(() => {
      const ingredientId = this.model().ingredientId;
      const changed = ingredientId !== previous;
      previous = ingredientId;
      if (!changed || !ingredientId) {
        return;
      }
      const price = untracked(this.ingredientPrices).get(ingredientId);
      untracked(() => {
        if (price && (parseEuros(this.model().extraPrice) ?? 0) === 0) {
          this.model.update((model) => ({ ...model, extraPrice: centsToInput(price) }));
        }
      });
    });
  }
}
