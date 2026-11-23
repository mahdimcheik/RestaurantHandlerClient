import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { applyEach, form, submit } from '@angular/forms/signals';
import { firstValueFrom, Observable } from 'rxjs';
import {
  CategoryDetails,
  MenuDetails,
  MenuSlotDetails,
  ProductDetails,
} from '../../../../core/api/generated';
import { apiErrorMessage } from '../../../../core/http/api-error';
import {
  eurosRule,
  focusFirstInvalid,
  integerRange,
  maxAtLeastMin,
  nameRules,
} from '../../../../shared/forms/validation';
import { MenusService } from '../../../../shared/services/menus.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { NumberField } from '../../../../shared/ui/number-field/number-field';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { centsToInput, EurosPipe, parseEuros } from '../../../../shared/utils/money';
import { moveItem } from '../../reorder';
import { MoveButtons } from '../move-buttons';
import { StatusBadges } from '../status-badges';

interface OptionModel {
  productId: string;
  name: string;
  extraPrice: string;
}

let nextId = 0;

const toRules = (slot: MenuSlotDetails) => ({
  label: slot.label,
  minChoices: slot.minChoices,
  maxChoices: slot.maxChoices,
});

const toOptions = (slot: MenuSlotDetails) => ({
  options: slot.options.map((option): OptionModel => ({
    productId: option.productId,
    name: option.productName,
    extraPrice: centsToInput(option.extraPriceCents),
  })),
});

/**
 * Un emplacement d'un menu (Plat, Accompagnement, Boisson…) : libellé, nombre de choix et
 * produits proposés avec leur surcoût. Chaque enregistrement renvoie le menu complet (`changed`).
 */
@Component({
  selector: 'app-menu-slot',
  imports: [TextField, NumberField, Icon, MoveButtons, StatusBadges, ConfirmDialog, EurosPipe],
  templateUrl: './menu-slot.html',
})
export class MenuSlot {
  readonly menuId = input.required<string>();
  readonly slot = input.required<MenuSlotDetails>();
  readonly first = input(false);
  readonly last = input(false);
  /** Vrai pendant un réordonnancement des emplacements par la page. */
  readonly locked = input(false);
  /** Produits actifs de la carte, seuls proposables dans un menu. */
  readonly products = input.required<readonly ProductDetails[]>();
  readonly categories = input.required<readonly CategoryDetails[]>();
  /** Déplacement demandé ; l'ordre complet est envoyé par la page. */
  readonly moved = output<-1 | 1>();
  readonly changed = output<MenuDetails>();

  private readonly menus = inject(MenusService);
  private readonly removeDialog = viewChild.required(ConfirmDialog);

  protected readonly rules = linkedSignal(() => toRules(this.slot()));
  protected readonly rulesForm = form(this.rules, (path) => {
    nameRules(path.label);
    integerRange(path.minChoices, 0, 10);
    integerRange(path.maxChoices, 1, 10);
    maxAtLeastMin(path.maxChoices, path.minChoices);
  });

  protected readonly options = linkedSignal(() => toOptions(this.slot()));
  protected readonly optionsForm = form(this.options, (path) => {
    applyEach(path.options, (option) => eurosRule(option.extraPrice, { required: true }));
  });

  private readonly activeIds = computed(
    () => new Set(this.products().map((product) => product.id)),
  );
  /** Produits ajoutables, rangés par catégorie dans l'ordre de la carte. */
  protected readonly productGroups = computed(() => {
    const used = new Set(this.options().options.map((option) => option.productId));
    return this.categories()
      .map((category) => ({
        label: category.name,
        products: this.products().filter(
          (product) => product.categoryId === category.id && !used.has(product.id),
        ),
      }))
      .filter((group) => group.products.length > 0);
  });
  protected readonly productToAdd = signal('');
  protected readonly id = `menu-slot-${nextId++}`;

  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  /** Un produit devenu inactif ou archivé est refusé par l'API : il est signalé pour être retiré. */
  protected isActive(productId: string): boolean {
    return this.activeIds().has(productId);
  }

  protected async saveRules(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.rulesForm, {
      action: async () => {
        const rules = this.rules();
        await this.run(
          this.menus.updateSlot(this.menuId(), this.slot().id, {
            label: rules.label.trim(),
            minChoices: rules.minChoices,
            maxChoices: rules.maxChoices,
          }),
          $localize`:@@menuSlot.saved:Emplacement enregistré.`,
        );
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }

  protected addProduct(): void {
    const product = this.products().find((candidate) => candidate.id === this.productToAdd());
    if (product) {
      this.updateOptions((options) => [
        ...options,
        { productId: product.id, name: product.name, extraPrice: '0,00' },
      ]);
      this.productToAdd.set('');
    }
  }

  protected moveProduct(index: number, offset: -1 | 1): void {
    this.updateOptions((options) => moveItem(options, index, offset));
  }

  protected removeProduct(index: number): void {
    this.updateOptions((options) => options.filter((_, i) => i !== index));
  }

  protected async saveOptions(): Promise<void> {
    await submit(this.optionsForm, {
      action: async () => {
        await this.run(
          this.menus.setSlotOptions(this.menuId(), this.slot().id, {
            options: this.options().options.map((option) => ({
              productId: option.productId,
              extraPriceCents: parseEuros(option.extraPrice) ?? 0,
            })),
          }),
          $localize`:@@menuSlot.productsSaved:Produits de l'emplacement enregistrés.`,
        );
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }

  protected askRemove(): void {
    this.removeDialog().open();
  }

  protected remove(): Promise<void> {
    return this.run(this.menus.removeSlot(this.menuId(), this.slot().id), '');
  }

  private updateOptions(change: (options: OptionModel[]) => OptionModel[]): void {
    this.options.update((model) => ({ options: change(model.options) }));
    this.notice.set('');
  }

  private async run(action: Observable<MenuDetails>, success: string): Promise<void> {
    this.error.set('');
    this.notice.set('');
    this.busy.set(true);
    try {
      const menu = await firstValueFrom(action);
      this.notice.set(success);
      this.changed.emit(menu);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
