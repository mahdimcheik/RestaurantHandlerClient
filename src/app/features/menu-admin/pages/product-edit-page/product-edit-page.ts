import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { applyEach, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, tap } from 'rxjs';
import {
  OptionGroupDetails,
  ProductDetails,
  ProductKind,
  ProductOptionGroupWrite,
  ProductWrite,
} from '../../../../core/api/generated';
import { apiErrorMessage } from '../../../../core/http/api-error';
import {
  eurosRule,
  focusFirstInvalid,
  integerRange,
  maxAtLeastMin,
  lengthRule,
  nameRules,
  requiredMessage,
} from '../../../../shared/forms/validation';
import { ProductsService } from '../../../../shared/services/products.service';
import { StoreService } from '../../../../shared/services/store.service';
import { CheckboxField } from '../../../../shared/ui/checkbox-field/checkbox-field';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ImageField } from '../../../../shared/ui/image-field/image-field';
import { NumberField } from '../../../../shared/ui/number-field/number-field';
import { SelectField, SelectOption } from '../../../../shared/ui/select-field/select-field';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { TextareaField } from '../../../../shared/ui/textarea-field/textarea-field';
import { centsToInput, parseEuros } from '../../../../shared/utils/money';
import { VAT_RATES } from '../../catalog-options';
import { ArchiveButton } from '../../components/archive-button';
import { MoveButtons } from '../../components/move-buttons';
import { moveItem } from '../../reorder';
import { ProductComposition } from '../../components/product-composition/product-composition';

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
  { value: 'Dish', label: 'Plat' },
  { value: 'Drink', label: 'Boisson' },
  { value: 'Dessert', label: 'Dessert' },
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

/** Groupe proposé sur le produit ; les nombres ne sont envoyés que s'ils lui sont propres. */
interface GroupLinkModel {
  id: string;
  custom: boolean;
  minChoices: number;
  maxChoices: number;
}

const toLink = (group: OptionGroupDetails): GroupLinkModel => {
  const rules = group.productRules ?? group;
  return {
    id: group.id,
    custom: group.productRules != null,
    minChoices: rules.minChoices,
    maxChoices: rules.maxChoices,
  };
};

const toLinkWrite = (link: GroupLinkModel): ProductOptionGroupWrite => ({
  optionGroupId: link.id,
  rules: link.custom ? { minChoices: link.minChoices, maxChoices: link.maxChoices } : undefined,
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
    NumberField,
    ImageField,
    ArchiveButton,
    MoveButtons,
    ProductComposition,
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
  protected readonly available = linkedSignal(() => this.product.value()?.isAvailable ?? true);
  protected readonly togglingAvailability = signal(false);

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
  protected readonly groupLinks = linkedSignal(() => ({
    links: this.product.value()?.optionGroups.map(toLink) ?? [],
  }));
  protected readonly groupsForm = form(this.groupLinks, (path) => {
    applyEach(path.links, (link) => {
      integerRange(link.minChoices, 0, 20);
      integerRange(link.maxChoices, 1, 20);
      maxAtLeastMin(link.maxChoices, link.minChoices);
    });
  });
  protected readonly groupsById = computed(
    () => new Map(this.store.optionGroups.value().map((group) => [group.id, group])),
  );
  protected readonly availableGroups = computed(() => {
    const used = new Set(this.groupLinks().links.map((link) => link.id));
    return this.store.optionGroups.value().filter((group) => !used.has(group.id));
  });
  protected readonly groupToAdd = signal('');
  protected readonly groupsError = signal('');
  protected readonly groupsNotice = signal('');
  protected readonly savingGroups = signal(false);

  protected readonly uploadImage = (file: File) =>
    this.products
      .uploadImage(this.id()!, file)
      .pipe(tap((product) => this.imageUrl.set(product.imageUrl)));

  protected readonly removeImage = () =>
    this.products
      .removeImage(this.id()!)
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
            this.notice.set('Modifications enregistrées.');
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
    const group = this.groupsById().get(this.groupToAdd());
    if (group) {
      this.updateLinks((links) => [...links, toLink({ ...group, productRules: undefined })]);
      this.groupToAdd.set('');
    }
  }

  protected moveGroup(index: number, offset: -1 | 1): void {
    this.updateLinks((links) => moveItem(links, index, offset));
  }

  protected removeGroup(index: number): void {
    this.updateLinks((links) => links.filter((_, i) => i !== index));
  }

  protected async saveGroups(): Promise<void> {
    this.groupsError.set('');
    this.groupsNotice.set('');
    await submit(this.groupsForm, {
      action: async () => {
        this.savingGroups.set(true);
        try {
          const updated = await firstValueFrom(
            this.products.setOptionGroups(this.id()!, this.groupLinks().links.map(toLinkWrite)),
          );
          this.groupLinks.set({ links: updated.optionGroups.map(toLink) });
          this.groupsNotice.set(`Groupes d'options enregistrés.`);
        } catch (error) {
          this.groupsError.set(apiErrorMessage(error));
        } finally {
          this.savingGroups.set(false);
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }

  private updateLinks(change: (links: GroupLinkModel[]) => GroupLinkModel[]): void {
    this.groupLinks.update((model) => ({ links: change(model.links) }));
    this.groupsNotice.set('');
  }

  protected async toggleAvailability(): Promise<void> {
    this.error.set('');
    this.notice.set('');
    this.togglingAvailability.set(true);
    try {
      const updated = await firstValueFrom(
        this.products.setAvailability(this.id()!, { isAvailable: !this.available() }),
      );
      this.available.set(updated.isAvailable);
      this.notice.set(
        updated.isAvailable
          ? `« ${updated.name} » est de nouveau disponible.`
          : `« ${updated.name} » est en rupture.`,
      );
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.togglingAvailability.set(false);
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
