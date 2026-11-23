import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, submit } from '@angular/forms/signals';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { IngredientDetails } from '../../../../core/api/generated';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { eurosRule, focusFirstInvalid, nameRules } from '../../../../shared/forms/validation';
import { IngredientsService } from '../../../../shared/services/ingredients.service';
import { StoreService } from '../../../../shared/services/store.service';
import { CheckboxField } from '../../../../shared/ui/checkbox-field/checkbox-field';
import { ImageField } from '../../../../shared/ui/image-field/image-field';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { centsToInput, EurosPipe, parseEuros } from '../../../../shared/utils/money';
import { ArchiveButton } from '../../components/archive-button';
import { IngredientQuickAdd } from '../../components/ingredient-quick-add';
import { StatusBadges } from '../../components/status-badges';

/**
 * Ingrédients de la carte : ajout, modification (nom, prix de référence, proposé en
 * remplacement, photo), rupture de stock et archivage, sur une seule page. Sert aussi en service pour
 * signaler une rupture : elle grise les choix liés et peut rendre des produits indisponibles.
 */
@Component({
  selector: 'app-ingredient-list-page',
  imports: [
    TextField,
    CheckboxField,
    ImageField,
    EurosPipe,
    ArchiveButton,
    IngredientQuickAdd,
    StatusBadges,
  ],
  templateUrl: './ingredient-list-page.html',
})
export class IngredientListPage {
  private readonly store = inject(StoreService);
  private readonly ingredients = inject(IngredientsService);

  protected readonly showArchived = signal(false);
  protected readonly search = signal('');
  private readonly withArchived = rxResource({
    params: () => (this.showArchived() ? true : undefined),
    stream: () => this.ingredients.list({ includeArchived: true }),
  });

  private readonly all = computed(() =>
    this.showArchived() ? (this.withArchived.value() ?? []) : this.store.ingredients.value(),
  );
  protected readonly rows = computed(() => {
    const query = normalize(this.search().trim());
    const rows = query
      ? this.all().filter((ingredient) => normalize(ingredient.name).includes(query))
      : this.all();
    return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  });
  protected readonly total = computed(() => this.all().length);
  protected readonly loading = computed(() =>
    this.showArchived() ? this.withArchived.isLoading() : this.store.ingredients.isLoading(),
  );
  protected readonly loadError = computed(() => {
    const error = this.showArchived() ? this.withArchived.error() : this.store.ingredients.error();
    return error ? apiErrorMessage(error) : '';
  });

  protected readonly error = signal('');
  protected readonly notice = signal('');
  /** Ingrédient en cours d'action (rupture, archivage), pour désactiver ses boutons. */
  protected readonly busyId = signal<string | null>(null);

  /** Ingrédient en cours de modification. */
  protected readonly editingId = signal<string | null>(null);
  private readonly editModel = signal({ name: '', price: '0,00', isOfferedAsReplacement: true });
  protected readonly editForm = form(this.editModel, (path) => {
    nameRules(path.name);
    eurosRule(path.price, { required: true });
  });

  constructor() {
    this.store.ingredients.load();
  }

  protected created(ingredient: IngredientDetails): void {
    this.error.set('');
    this.notice.set($localize`:@@ingredient.created:« ${ingredient.name}:name: » ajouté.`);
  }

  protected toggleAvailability(ingredient: IngredientDetails): Promise<void> {
    return this.run(
      ingredient,
      this.ingredients.setAvailability(ingredient.id, { isAvailable: !ingredient.isAvailable }),
      ingredient.isAvailable
        ? $localize`:@@ingredient.markedOut:« ${ingredient.name}:name: » est en rupture.`
        : $localize`:@@ingredient.markedIn:« ${ingredient.name}:name: » est de nouveau disponible.`,
    );
  }

  protected archive(ingredient: IngredientDetails): Promise<void> {
    return this.run(
      ingredient,
      this.ingredients.remove(ingredient.id),
      $localize`:@@ingredient.archived:« ${ingredient.name}:name: » archivé.`,
    );
  }

  /** Photo de l'ingrédient en cours d'édition, mise à jour à chaque envoi ou retrait. */
  protected readonly editImageUrl = signal<string | null | undefined>(null);

  protected readonly uploadImage = (file: File) =>
    this.ingredients.uploadImage(this.editingId()!, file).pipe(tap((i) => this.photoChanged(i)));

  protected readonly removeImage = () =>
    this.ingredients.removeImage(this.editingId()!).pipe(tap((i) => this.photoChanged(i)));

  private photoChanged(ingredient: IngredientDetails): void {
    this.editImageUrl.set(ingredient.imageUrl);
    if (this.showArchived()) {
      this.withArchived.reload();
    }
  }

  protected startEdit(ingredient: IngredientDetails): void {
    this.editModel.set({
      name: ingredient.name,
      price: centsToInput(ingredient.priceCents),
      isOfferedAsReplacement: ingredient.isOfferedAsReplacement,
    });
    this.editForm().reset();
    this.editImageUrl.set(ingredient.imageUrl);
    this.editingId.set(ingredient.id);
    this.notice.set('');
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected async save(event: Event, ingredient: IngredientDetails): Promise<void> {
    event.preventDefault();
    this.error.set('');
    await submit(this.editForm, {
      action: async () => {
        const model = this.editModel();
        await this.run(
          ingredient,
          this.ingredients.update(ingredient.id, {
            name: model.name.trim(),
            priceCents: parseEuros(model.price) ?? 0,
            isOfferedAsReplacement: model.isOfferedAsReplacement,
          }),
          $localize`:@@ingredient.saved:« ${model.name.trim()}:name: » enregistré.`,
        );
        if (!this.error()) {
          this.editingId.set(null);
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }

  private async run(
    ingredient: IngredientDetails,
    action: Observable<unknown>,
    success: string,
  ): Promise<void> {
    this.error.set('');
    this.notice.set('');
    this.busyId.set(ingredient.id);
    try {
      await firstValueFrom(action, { defaultValue: undefined });
      if (this.showArchived()) {
        this.withArchived.reload();
      }
      this.notice.set(success);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.busyId.set(null);
    }
  }
}

/** Recherche insensible à la casse et aux accents : « oeuf » trouve « Œuf », « epices » « Épices ». */
const normalize = (value: string) =>
  value
    .toLocaleLowerCase('fr')
    .replaceAll('œ', 'oe')
    .replaceAll('æ', 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
