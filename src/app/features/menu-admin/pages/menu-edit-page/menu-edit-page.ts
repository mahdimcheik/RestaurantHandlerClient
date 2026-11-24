import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, tap } from 'rxjs';
import { MenuDetails, MenuWrite } from '../../../../core/api/generated';
import { apiErrorMessage } from '../../../../core/http/api-error';
import {
  eurosRule,
  focusFirstInvalid,
  integerRange,
  lengthRule,
  maxAtLeastMin,
  nameRules,
} from '../../../../shared/forms/validation';
import { MenusService } from '../../../../shared/services/menus.service';
import { StoreService } from '../../../../shared/services/store.service';
import { CheckboxField } from '../../../../shared/ui/checkbox-field/checkbox-field';
import { ImageField } from '../../../../shared/ui/image-field/image-field';
import { NumberField } from '../../../../shared/ui/number-field/number-field';
import { SelectField } from '../../../../shared/ui/select-field/select-field';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { TextareaField } from '../../../../shared/ui/textarea-field/textarea-field';
import { centsToInput, parseEuros } from '../../../../shared/utils/money';
import { VAT_RATES } from '../../catalog-options';
import { ArchiveButton } from '../../components/archive-button';
import { MenuSlot } from '../../components/menu-slot/menu-slot';
import { moveItem } from '../../reorder';

interface MenuModel {
  name: string;
  description: string;
  price: string;
  vatRate: string;
  isActive: boolean;
}

const toModel = (menu: MenuDetails | undefined): MenuModel => ({
  name: menu?.name ?? '',
  description: menu?.description ?? '',
  price: menu ? centsToInput(menu.priceCents) : '',
  vatRate: menu ? String(menu.vatRate) : '10',
  isActive: menu?.isActive ?? true,
});

const toWrite = (model: MenuModel): MenuWrite => ({
  name: model.name.trim(),
  description: model.description.trim() || null,
  priceCents: parseEuros(model.price) ?? 0,
  vatRate: Number(model.vatRate),
  isActive: model.isActive,
});

const emptySlot = () => ({ label: '', minChoices: 1, maxChoices: 1 });

/** Création (`/nouveau`) ou modification (`/:id`) d'un menu à prix fixe et de ses emplacements. */
@Component({
  selector: 'app-menu-edit-page',
  imports: [
    RouterLink,
    TextField,
    TextareaField,
    SelectField,
    CheckboxField,
    NumberField,
    ImageField,
    ArchiveButton,
    MenuSlot,
  ],
  templateUrl: './menu-edit-page.html',
})
export class MenuEditPage {
  /** Paramètre de route ; absent pour une création. */
  readonly id = input<string>();

  private readonly menus = inject(MenusService);
  private readonly store = inject(StoreService);
  private readonly router = inject(Router);

  protected readonly vatRates = VAT_RATES;

  private readonly loaded = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.menus.get(id),
  });
  /** Menu affiché : celui chargé, puis celui renvoyé par chaque enregistrement. */
  protected readonly menu = linkedSignal(() => this.loaded.value());
  protected readonly loading = computed(() => this.loaded.isLoading() && !this.menu());
  protected readonly loadError = computed(() =>
    this.loaded.error() ? apiErrorMessage(this.loaded.error()) : '',
  );
  protected readonly archived = computed(() => this.menu()?.isArchived ?? false);
  protected readonly name = computed(() => this.menu()?.name ?? '');

  protected readonly model = linkedSignal(() => toModel(this.loaded.value()));
  protected readonly form = form(this.model, (path) => {
    nameRules(path.name, 128);
    lengthRule(path.description, 1000);
    eurosRule(path.price, { required: true });
  });
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly archiving = signal(false);

  /** Seuls les produits actifs peuvent être proposés dans un menu. */
  protected readonly activeProducts = computed(() =>
    this.store.products.value().filter((product) => product.isActive),
  );
  protected readonly categories = this.store.categories.value;

  protected readonly newSlot = signal(emptySlot());
  protected readonly slotForm = form(this.newSlot, (path) => {
    nameRules(path.label);
    integerRange(path.minChoices, 0, 10);
    integerRange(path.maxChoices, 1, 10);
    maxAtLeastMin(path.maxChoices, path.minChoices);
  });
  protected readonly slotsError = signal('');
  protected readonly slotsNotice = signal('');
  protected readonly movingSlots = signal(false);

  protected readonly uploadImage = (file: File) =>
    this.menus.uploadImage(this.id()!, file).pipe(tap((menu) => this.menu.set(menu)));

  protected readonly removeImage = () =>
    this.menus.removeImage(this.id()!).pipe(tap((menu) => this.menu.set(menu)));

  constructor() {
    this.store.products.load();
    this.store.categories.load();
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
            const updated = await firstValueFrom(this.menus.update(id, toWrite(this.model())));
            this.menu.set(updated);
            this.model.set(toModel(updated));
            this.notice.set('Modifications enregistrées.');
          } else {
            const created = await firstValueFrom(this.menus.create(toWrite(this.model())));
            await this.router.navigate(['/gestion/menus', created.id], { replaceUrl: true });
          }
        } catch (error) {
          this.error.set(apiErrorMessage(error));
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }

  protected async addSlot(event: Event): Promise<void> {
    event.preventDefault();
    this.slotsError.set('');
    this.slotsNotice.set('');
    await submit(this.slotForm, {
      action: async () => {
        const slot = this.newSlot();
        try {
          const updated = await firstValueFrom(
            this.menus.addSlot(this.id()!, { ...slot, label: slot.label.trim() }),
          );
          this.menu.set(updated);
          this.newSlot.set(emptySlot());
          this.slotForm().reset();
          this.slotsNotice.set(`Emplacement « ${slot.label.trim()} » ajouté.`);
        } catch (error) {
          this.slotsError.set(apiErrorMessage(error));
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }

  protected async moveSlot(index: number, offset: -1 | 1): Promise<void> {
    const slots = this.menu()?.slots ?? [];
    this.slotsError.set('');
    this.slotsNotice.set('');
    this.movingSlots.set(true);
    try {
      const orderedIds = moveItem(slots, index, offset).map((slot) => slot.id);
      this.menu.set(await firstValueFrom(this.menus.reorderSlots(this.id()!, { orderedIds })));
    } catch (error) {
      this.slotsError.set(apiErrorMessage(error));
      this.loaded.reload();
    } finally {
      this.movingSlots.set(false);
    }
  }

  protected async archive(): Promise<void> {
    this.error.set('');
    this.archiving.set(true);
    try {
      await firstValueFrom(this.menus.remove(this.id()!));
      await this.router.navigate(['/gestion/menus']);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.archiving.set(false);
    }
  }
}
