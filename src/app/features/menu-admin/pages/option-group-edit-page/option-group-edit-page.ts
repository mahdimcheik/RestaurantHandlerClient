import {
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { applyEach, form, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { OptionGroupDetails, OptionGroupWrite } from '../../../../core/api/generated';
import { apiErrorMessage } from '../../../../core/http/api-error';
import {
  eurosRule,
  focusFirstInvalid,
  integerRange,
  nameRules,
} from '../../../../shared/forms/validation';
import { OptionGroupsService } from '../../../../shared/services/option-groups.service';
import { StoreService } from '../../../../shared/services/store.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ImageField } from '../../../../shared/ui/image-field/image-field';
import { NumberField } from '../../../../shared/ui/number-field/number-field';
import { SelectField, SelectOption } from '../../../../shared/ui/select-field/select-field';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { centsToInput, parseEuros } from '../../../../shared/utils/money';
import { ArchiveButton } from '../../components/archive-button';

interface ChoiceModel {
  /** Null pour un choix pas encore enregistré. */
  id: string | null;
  name: string;
  extraPrice: string;
  ingredientId: string;
}

interface GroupModel {
  label: string;
  minChoices: number;
  maxChoices: number;
  freeChoices: number;
  extraChoicePrice: string;
  maxPerChoice: number;
  choices: ChoiceModel[];
}

const newChoice = (): ChoiceModel => ({ id: null, name: '', extraPrice: '0,00', ingredientId: '' });

const toModel = (group: OptionGroupDetails | undefined): GroupModel => ({
  label: group?.label ?? '',
  minChoices: group?.minChoices ?? 1,
  maxChoices: group?.maxChoices ?? 1,
  freeChoices: group?.freeChoices ?? 1,
  extraChoicePrice: centsToInput(group?.extraChoicePriceCents ?? 0),
  maxPerChoice: group?.maxPerChoice ?? 1,
  choices: group?.choices.map((choice) => ({
    id: choice.id,
    name: choice.name,
    extraPrice: centsToInput(choice.extraPriceCents),
    ingredientId: choice.ingredientId ?? '',
  })) ?? [newChoice(), newChoice()],
});

const toWrite = (model: GroupModel): OptionGroupWrite => ({
  label: model.label.trim(),
  minChoices: model.minChoices,
  maxChoices: model.maxChoices,
  freeChoices: model.freeChoices,
  extraChoicePriceCents: parseEuros(model.extraChoicePrice) ?? 0,
  maxPerChoice: model.maxPerChoice,
  choices: model.choices.map((choice) => ({
    id: choice.id,
    name: choice.name.trim(),
    extraPriceCents: parseEuros(choice.extraPrice) ?? 0,
    ingredientId: choice.ingredientId || null,
  })),
});

/**
 * Création (`/nouveau`) ou modification (`/:id`) d'un groupe d'options partagé et de ses choix.
 * Les contrôles servent au confort de saisie : le serveur valide.
 */
@Component({
  selector: 'app-option-group-edit-page',
  imports: [RouterLink, Icon, TextField, NumberField, SelectField, ImageField, ArchiveButton],
  templateUrl: './option-group-edit-page.html',
})
export class OptionGroupEditPage {
  /** Paramètre de route ; absent pour une création. */
  readonly id = input<string>();

  private readonly groups = inject(OptionGroupsService);
  private readonly store = inject(StoreService);
  private readonly router = inject(Router);

  protected readonly group = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.groups.get(id),
  });
  protected readonly loadError = computed(() =>
    this.group.error() ? apiErrorMessage(this.group.error()) : '',
  );
  protected readonly archived = computed(() => this.group.value()?.isArchived ?? false);
  protected readonly imageUrl = linkedSignal(() => this.group.value()?.imageUrl);
  protected readonly choiceImages = linkedSignal(
    () => new Map(this.group.value()?.choices.map((choice) => [choice.id, choice.imageUrl]) ?? []),
  );

  /** Produits non archivés qui proposent ce groupe (depuis le cache des produits). */
  protected readonly usedBy = computed(() =>
    this.store.products
      .value()
      .filter((product) => product.optionGroups.some((group) => group.id === this.id())),
  );
  protected readonly ingredientOptions = computed<SelectOption[]>(() =>
    this.store.ingredients
      .value()
      .map((ingredient) => ({ value: ingredient.id, label: ingredient.name })),
  );

  /** Photo de chaque ingrédient, reprise sur la carte par un choix lié qui n'a pas la sienne. */
  protected readonly ingredientImages = computed(
    () =>
      new Map(
        this.store.ingredients.value().map((ingredient) => [ingredient.id, ingredient.imageUrl]),
      ),
  );

  protected readonly model = linkedSignal(() => toModel(this.group.value()));
  protected readonly form = form(this.model, (path) => {
    nameRules(path.label);
    integerRange(path.minChoices, 0, 20);
    integerRange(path.maxChoices, 1, 20);
    integerRange(path.freeChoices, 0, 20);
    validate(path.maxChoices, ({ value, valueOf }) =>
      value() < valueOf(path.minChoices)
        ? {
            kind: 'belowMin',
            message: $localize`:@@optionGroup.maxBelowMin:Le maximum doit être au moins égal au minimum.`,
          }
        : undefined,
    );
    eurosRule(path.extraChoicePrice, { required: true });
    integerRange(path.maxPerChoice, 1, 10);
    validate(path.choices, ({ value, valueOf }) =>
      value().length === 0 || value().length * valueOf(path.maxPerChoice) < valueOf(path.minChoices)
        ? {
            kind: 'tooFew',
            message: $localize`:@@optionGroup.tooFew:Proposez au moins un choix, et au moins autant que le minimum.`,
          }
        : undefined,
    );
    applyEach(path.choices, (choice) => {
      nameRules(choice.name);
      eurosRule(choice.extraPrice, { required: true });
    });
  });
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly archiving = signal(false);

  protected readonly uploadImage = (file: File) =>
    this.groups
      .uploadImage(this.id()!, file)
      .pipe(tap((group) => this.imageUrl.set(group.imageUrl)));

  protected readonly removeImage = () =>
    this.groups.removeImage(this.id()!).pipe(tap((group) => this.imageUrl.set(group.imageUrl)));

  /** Envoi et retrait de photo par choix enregistré, stables tant que la liste ne change pas. */
  protected readonly choiceUploaders = computed(() => {
    const id = this.id();
    const uploaders = new Map<
      string,
      {
        upload: (file: File) => Observable<OptionGroupDetails>;
        remove: () => Observable<OptionGroupDetails>;
      }
    >();
    for (const choice of this.group.value()?.choices ?? []) {
      const sync = tap((group: OptionGroupDetails) =>
        this.choiceImages.update((images) => {
          const next = new Map(images);
          next.set(choice.id, group.choices.find((c) => c.id === choice.id)?.imageUrl);
          return next;
        }),
      );
      uploaders.set(choice.id, {
        upload: (file: File) => this.groups.uploadChoiceImage(id!, choice.id, file).pipe(sync),
        remove: () => this.groups.removeChoiceImage(id!, choice.id).pipe(sync),
      });
    }
    return uploaders;
  });

  constructor() {
    this.store.ingredients.load();
    this.store.products.load();
    this.prefillChoicePrices();
  }

  /**
   * Un ingrédient tout juste lié à un choix encore à 0 € lui donne son prix de référence
   * (« Suppléments » : cheddar → +0,80 €). Ni les déplacements ni un prix saisi ne sont touchés.
   */
  private prefillChoicePrices(): void {
    let previous: string[] | null = null;
    effect(() => {
      const ids = this.model().choices.map((choice) => choice.ingredientId);
      const before = previous;
      previous = ids;
      if (!before || before.length !== ids.length) {
        return;
      }
      const prices = new Map(
        untracked(this.store.ingredients.value).map((ingredient) => [
          ingredient.id,
          ingredient.priceCents,
        ]),
      );
      const filled = ids.map((id, i) =>
        id && id !== before[i] && !before.includes(id) ? prices.get(id) : undefined,
      );
      if (filled.every((price) => !price)) {
        return;
      }
      untracked(() =>
        this.model.update((model) => ({
          ...model,
          choices: model.choices.map((choice, i) =>
            filled[i] && (parseEuros(choice.extraPrice) ?? 0) === 0
              ? { ...choice, extraPrice: centsToInput(filled[i]) }
              : choice,
          ),
        })),
      );
    });
  }

  protected addChoice(): void {
    this.model.update((model) => ({ ...model, choices: [...model.choices, newChoice()] }));
  }

  protected moveChoice(index: number, offset: -1 | 1): void {
    this.model.update((model) => {
      const choices = [...model.choices];
      [choices[index], choices[index + offset]] = [choices[index + offset], choices[index]];
      return { ...model, choices };
    });
  }

  protected removeChoice(index: number): void {
    this.model.update((model) => ({
      ...model,
      choices: model.choices.filter((_, i) => i !== index),
    }));
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitted.set(true);
    this.error.set('');
    this.notice.set('');
    await submit(this.form, {
      action: async () => {
        const id = this.id();
        try {
          if (id) {
            this.group.set(await firstValueFrom(this.groups.update(id, toWrite(this.model()))));
            this.notice.set($localize`:@@sheet.saved:Modifications enregistrées.`);
          } else {
            const created = await firstValueFrom(this.groups.create(toWrite(this.model())));
            await this.router.navigate(['/gestion/options', created.id], { replaceUrl: true });
          }
        } catch (error) {
          this.error.set(apiErrorMessage(error));
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }

  protected async archive(): Promise<void> {
    this.error.set('');
    this.archiving.set(true);
    try {
      await firstValueFrom(this.groups.remove(this.id()!));
      await this.router.navigate(['/gestion/options']);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.archiving.set(false);
    }
  }
}
