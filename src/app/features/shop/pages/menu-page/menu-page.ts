import { NgOptimizedImage } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { MenuChoice, MenuLine, toCartLines } from '../../../../shared/ordering/cart';
import {
  lineWithForcedRemovals,
  CustomizationState,
  EMPTY_STATE,
  missingGroups,
  stateOf,
  toCustomization,
} from '../../../../shared/ordering/customization';
import {
  CustomizeRequest,
  menuComplete,
  MenuSlots,
  prefilledChoices,
} from '../../../../shared/ordering/menu-slots';
import { LineNote } from '../../../../shared/ordering/line-note';
import { OptionsWizard } from '../../../../shared/ordering/options-wizard';
import { ProductOptions } from '../../../../shared/ordering/product-options';
import { PublicStore } from '../../../../shared/services/public-store.service';
import { ShareButtons } from '../../../../shared/ui/share-buttons/share-buttons';
import { EurosPipe } from '../../../../shared/utils/money';
import { OrderDialog } from '../../components/order-dialog/order-dialog';
import { CartStore } from '../../data-access/cart.store';
import { quoteOf } from '../../data-access/quote';

/**
 * Composition d'un menu (US-E04-2) : un produit par emplacement dans ses bornes, chaque produit
 * personnalisable comme sur sa fiche (composition, puis options pas à pas dans un second
 * dialogue) ; prix du menu et surcoûts par le devis du serveur.
 */
@Component({
  selector: 'app-menu-page',
  imports: [
    NgOptimizedImage,
    EurosPipe,
    MenuSlots,
    ProductOptions,
    OptionsWizard,
    LineNote,
    OrderDialog,
    ShareButtons,
  ],
  templateUrl: './menu-page.html',
})
export class MenuPage {
  private readonly store = inject(PublicStore);
  private readonly cart = inject(CartStore);
  private readonly router = inject(Router);

  readonly id = input.required<string>();
  readonly ligne = input<string>();

  private readonly heading = viewChild<ElementRef<HTMLElement>>('editHeading');

  protected readonly menu = computed(() => this.store.menus().get(this.id()));
  protected readonly siteName = computed(() => this.store.info.value()?.tradeName || 'Greenadine');
  protected readonly products = this.store.products;
  protected readonly replacements = this.store.replacements;
  protected readonly loading = computed(() => !this.store.card.value() && !this.store.card.error());
  protected readonly line = computed(() =>
    this.cart
      .lines()
      .find(
        (line): line is MenuLine =>
          line.kind === 'menu' && line.key === this.ligne() && line.menuId === this.id(),
      ),
  );

  protected readonly choices = linkedSignal<string, MenuChoice[]>({
    source: () => `${this.id()}|${this.ligne() ?? ''}|${this.menu() ? 1 : 0}`,
    computation: () => {
      const line = untracked(this.line);
      const menu = untracked(this.menu);
      return line ? line.choices : menu ? prefilledChoices(menu) : [];
    },
  });
  /** Précision pour la cuisine sur tout le menu, reprise d'une ligne modifiée. */
  protected readonly note = linkedSignal<string, string>({
    source: () => `${this.id()}|${this.ligne() ?? ''}`,
    computation: () => untracked(this.line)?.note ?? '',
  });
  /** Une portion par ligne (petites commandes) ; une ligne modifiée garde sa quantité. */
  private readonly quantity = computed(() => this.line()?.quantity ?? 1);

  /** Produit choisi en cours de personnalisation, et son état. */
  protected readonly editing = signal<CustomizeRequest | null>(null);
  protected readonly editState = signal<CustomizationState>(EMPTY_STATE);
  /** Assistant des groupes d'options du produit en cours, par-dessus la fiche du menu. */
  protected readonly wizardOpen = signal(false);
  protected readonly editMissing = computed(() => {
    const editing = this.editing();
    return editing ? missingGroups(editing.product, this.editState()) : [];
  });

  protected readonly complete = computed(() => {
    const menu = this.menu();
    return !!menu && menu.isAvailable && menuComplete(menu, this.choices(), this.products());
  });
  protected readonly quote = quoteOf(() => {
    const menu = this.menu();
    if (!menu || !this.complete()) {
      return undefined;
    }
    const line: MenuLine = {
      kind: 'menu',
      key: '',
      menuId: menu.id,
      name: menu.name,
      quantity: this.quantity(),
      choices: this.choices(),
    };
    return toCartLines([lineWithForcedRemovals(line, this.products())]);
  });
  protected readonly issue = computed(() => this.quote.issues()[0]?.message ?? this.quote.error());

  constructor() {
    inject(RealtimeService).start();
    this.store.card.load();
  }

  protected customize(request: CustomizeRequest): void {
    this.editing.set(request);
    this.editState.set(request.quick ? EMPTY_STATE : stateOf(request.choice.customization));
    // Choix obligatoire à l'ajout du produit : l'assistant s'ouvre tout de suite.
    this.wizardOpen.set(request.quick && request.product.groups.length > 0);
    if (!this.wizardOpen()) {
      queueMicrotask(() => this.heading()?.nativeElement.focus());
    }
  }

  protected applyCustomization(): void {
    const editing = this.editing();
    if (!editing || this.editMissing().length > 0) {
      return;
    }
    const names = new Map(this.replacements().map((r) => [r.id, r.name]));
    const customization = toCustomization(
      editing.product,
      this.editState(),
      (id) => names.get(id) ?? '',
    );
    this.choices.update((choices) =>
      choices.map((choice) => (choice === editing.choice ? { ...choice, customization } : choice)),
    );
    this.wizardOpen.set(false);
    this.editing.set(null);
  }

  protected cancelCustomization(): void {
    this.wizardOpen.set(false);
    this.editing.set(null);
  }

  /** Options choisies : retour à la composition du produit (remplacements), puis « Valider ». */
  protected optionsDone(): void {
    this.editing.update((editing) => (editing ? { ...editing, quick: false } : editing));
    this.wizardOpen.set(false);
    queueMicrotask(() => this.heading()?.nativeElement.focus());
  }

  /** Assistant refermé sans valider : retour à la composition, ou au menu s'il s'est ouvert seul. */
  protected onWizardClosed(): void {
    if (this.editing()?.quick) {
      this.cancelCustomization();
      return;
    }
    this.wizardOpen.set(false);
    queueMicrotask(() => this.heading()?.nativeElement.focus());
  }

  protected async add(): Promise<void> {
    const menu = this.menu();
    if (!menu || !this.complete()) {
      return;
    }
    const line = this.line();
    if (line) {
      this.cart.replaceMenuChoices(line.key, this.choices());
      this.cart.setNote(line.key, this.note());
      await this.close();
      return;
    }
    this.cart.addMenu(menu, this.choices(), this.quantity(), this.note());
    await this.close();
  }

  /** Retour à la carte, qui referme le dialogue sans la faire défiler. */
  private async close(): Promise<void> {
    await this.router.navigate(['/commander'], { scroll: 'manual' });
  }
}
