import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, tap } from 'rxjs';
import { ProductDetails, ProductKind, ProductWrite } from '../../../../core/api/generated';
import { apiErrorMessage } from '../../../../core/http/api-error';
import {
  eurosRule,
  focusFirstInvalid,
  lengthRule,
  nameRules,
  requiredMessage,
} from '../../../../shared/forms/validation';
import { ProductsService } from '../../../../shared/services/products.service';
import { StoreService } from '../../../../shared/services/store.service';
import { CheckboxField } from '../../../../shared/ui/checkbox-field/checkbox-field';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ImageField } from '../../../../shared/ui/image-field/image-field';
import { SelectField, SelectOption } from '../../../../shared/ui/select-field/select-field';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { TextareaField } from '../../../../shared/ui/textarea-field/textarea-field';
import { centsToInput, parseEuros } from '../../../../shared/utils/money';
import { ArchiveButton } from '../../components/archive-button';

interface ProductModel {
  name: string;
  description: string;
  categoryId: string;
  kind: string;
  price: string;
  vatRate: string;
  isActive: boolean;
}

const KINDS: readonly SelectOption[] = [
  { value: 'Dish', label: $localize`:@@kind.dish:Plat` },
  { value: 'Drink', label: $localize`:@@kind.drink:Boisson` },
  { value: 'Dessert', label: $localize`:@@kind.dessert:Dessert` },
];

/** Liste fermée de l'API (conformité fiscale). */
const VAT_RATES: readonly SelectOption[] = [
  { value: '5.5', label: '5,5 %' },
  { value: '10', label: '10 %' },
  { value: '20', label: '20 %' },
];

const toModel = (product: ProductDetails | undefined, categoryId: string): ProductModel => ({
  name: product?.name ?? '',
  description: product?.description ?? '',
  categoryId: product?.categoryId ?? categoryId,
  kind: product?.kind ?? 'Dish',
  price: product ? centsToInput(product.priceCents) : '',
  vatRate: product ? String(product.vatRate) : '10',
  isActive: product?.isActive ?? true,
});

const toWrite = (model: ProductModel): ProductWrite => ({
  name: model.name.trim(),
  description: model.description.trim() || null,
  categoryId: model.categoryId,
  kind: model.kind as ProductKind,
  priceCents: parseEuros(model.price) ?? 0,
  vatRate: Number(model.vatRate),
  isActive: model.isActive,
});

/** Création (`/nouveau`) ou modification (`/:id`) d'un produit et de ses groupes d'options. */
@Component({
  selector: 'app-product-edit-page',
  imports: [
    RouterLink,
    Icon,
    TextField,
    TextareaField,
    SelectField,
    CheckboxField,
    ImageField,
    ArchiveButton,
  ],
  templateUrl: './product-edit-page.html',
})
export class ProductEditPage {
  /** Paramètre de route ; absent pour une création. */
  readonly id = input<string>();
  /** `?categorie=` : catégorie proposée à la création. */
  readonly categorie = input<string>();

  private readonly products = inject(ProductsService);
  private readonly store = inject(StoreService);
  private readonly router = inject(Router);

  protected readonly kinds = KINDS;
  protected readonly vatRates = VAT_RATES;
  protected readonly categoryOptions = computed<SelectOption[]>(() =>
    this.store.categories.value().map((category) => ({ value: category.id, label: category.name })),
  );

  protected readonly product = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.products.get(id),
  });
  protected readonly loadError = computed(() =>
    this.product.error() ? apiErrorMessage(this.product.error()) : '',
  );
  protected readonly archived = computed(() => this.product.value()?.isArchived ?? false);
  protected readonly imageUrl = linkedSignal(() => this.product.value()?.imageUrl);
  protected readonly name = linkedSignal(() => this.product.value()?.name ?? '');

  protected readonly model = linkedSignal(() =>
    toModel(this.product.value(), this.categorie() ?? ''),
  );
  protected readonly form = form(this.model, (path) => {
    nameRules(path.name, 128);
    lengthRule(path.description, 1000);
    required(path.categoryId, { message: requiredMessage });
    eurosRule(path.price, { required: true });
  });
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly archiving = signal(false);

  /** Groupes proposés, dans l'ordre d'affichage ; enregistrés à part du formulaire. */
  protected readonly groupIds = linkedSignal(
    () => this.product.value()?.optionGroups.map((group) => group.id) ?? [],
  );
  private readonly groupsById = computed(
    () => new Map(this.store.optionGroups.value().map((group) => [group.id, group])),
  );
  protected readonly selectedGroups = computed(() =>
    this.groupIds().flatMap((id) => this.groupsById().get(id) ?? []),
  );
  protected readonly availableGroups = computed(() =>
    this.store.optionGroups.value().filter((group) => !this.groupIds().includes(group.id)),
  );
  protected readonly groupToAdd = signal('');
  protected readonly groupsError = signal('');
  protected readonly groupsNotice = signal('');
  protected readonly savingGroups = signal(false);

  protected readonly uploadImage = (file: File) =>
    this.products
      .uploadImage(this.id()!, file)
      .pipe(tap((product) => this.imageUrl.set(product.imageUrl)));

  constructor() {
    this.store.categories.load();
    this.store.optionGroups.load();
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set('');
    this.notice.set('');
    await submit(this.form, {
      action: async () => {
        const id = this.id();
        try {
          if (id) {
            const updated = await firstValueFrom(this.products.update(id, toWrite(this.model())));
            this.model.set(toModel(updated, ''));
            this.name.set(updated.name);
            this.notice.set($localize`:@@sheet.saved:Modifications enregistrées.`);
          } else {
            const created = await firstValueFrom(this.products.create(toWrite(this.model())));
            await this.router.navigate(['/gestion/produits', created.id], { replaceUrl: true });
          }
        } catch (error) {
          this.error.set(apiErrorMessage(error));
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }

  protected addGroup(): void {
    const id = this.groupToAdd();
    if (id) {
      this.groupIds.update((ids) => [...ids, id]);
      this.groupToAdd.set('');
      this.groupsNotice.set('');
    }
  }

  protected moveGroup(index: number, offset: -1 | 1): void {
    this.groupIds.update((ids) => {
      const next = [...ids];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
    this.groupsNotice.set('');
  }

  protected removeGroup(index: number): void {
    this.groupIds.update((ids) => ids.filter((_, i) => i !== index));
    this.groupsNotice.set('');
  }

  protected async saveGroups(): Promise<void> {
    this.groupsError.set('');
    this.groupsNotice.set('');
    this.savingGroups.set(true);
    try {
      const updated = await firstValueFrom(
        this.products.setOptionGroups(this.id()!, this.groupIds()),
      );
      this.groupIds.set(updated.optionGroups.map((group) => group.id));
      this.groupsNotice.set($localize`:@@product.groupsSaved:Groupes d'options enregistrés.`);
    } catch (error) {
      this.groupsError.set(apiErrorMessage(error));
    } finally {
      this.savingGroups.set(false);
    }
  }

  protected async archive(): Promise<void> {
    this.error.set('');
    this.archiving.set(true);
    try {
      await firstValueFrom(this.products.remove(this.id()!));
      await this.router.navigate(['/gestion/produits']);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.archiving.set(false);
    }
  }
}
