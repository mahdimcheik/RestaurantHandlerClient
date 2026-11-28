import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { NO_CUSTOMIZATION, ProductLine } from '../../../../shared/ordering/cart';
import {
  chosenLabels,
  CustomizationState,
  EMPTY_STATE,
  missingGroups,
  stateOf,
  toCustomization,
} from '../../../../shared/ordering/customization';
import { LineNote } from '../../../../shared/ordering/line-note';
import { ChoiceGroup } from '../../../../shared/ordering/model';
import { OptionsWizard } from '../../../../shared/ordering/options-wizard';
import { ProductOptions } from '../../../../shared/ordering/product-options';
import { PublicStore } from '../../../../shared/services/public-store.service';
import { ShareButtons } from '../../../../shared/ui/share-buttons/share-buttons';
import { EurosPipe } from '../../../../shared/utils/money';
import { OrderDialog } from '../../components/order-dialog/order-dialog';
import { CartStore } from '../../data-access/cart.store';
import { quoteOf } from '../../data-access/quote';

/**
 * Fiche produit (US-E04-1) : retraits, remplacements au surcoût affiché et quantité sur la fiche ;
 * les groupes d'options se choisissent pas à pas dans un second dialogue (`app-options-wizard`).
 * Le prix de la ligne vient du devis du serveur à chaque choix. `ligne`
 * (paramètre d'adresse) rouvre une ligne du panier pour la modifier.
 */
@Component({
  selector: 'app-product-page',
  imports: [
    RouterLink,
    NgOptimizedImage,
    EurosPipe,
    ProductOptions,
    OptionsWizard,
    LineNote,
    OrderDialog,
    ShareButtons,
  ],
  templateUrl: './product-page.html',
})
export class ProductPage {
  private readonly store = inject(PublicStore);
  private readonly cart = inject(CartStore);
  private readonly router = inject(Router);

  readonly id = input.required<string>();
  readonly ligne = input<string>();

  protected readonly product = computed(() => this.store.products().get(this.id()));
  protected readonly siteName = computed(() => this.store.info.value()?.tradeName || 'Greenadine');
  protected readonly replacements = this.store.replacements;
  protected readonly loading = computed(() => !this.store.card.value() && !this.store.card.error());
  /** Ligne du panier en cours de modification. */
  protected readonly line = computed(() =>
    this.cart
      .lines()
      .find(
        (line): line is ProductLine =>
          line.kind === 'product' && line.key === this.ligne() && line.productId === this.id(),
      ),
  );

  protected readonly state = linkedSignal<string, CustomizationState>({
    source: () => `${this.id()}|${this.ligne() ?? ''}`,
    computation: () => {
      const line = untracked(this.line);
      return line ? stateOf(line.customization) : EMPTY_STATE;
    },
  });
  /** Précision pour la cuisine, reprise d'une ligne modifiée. */
  protected readonly note = linkedSignal<string, string>({
    source: () => `${this.id()}|${this.ligne() ?? ''}`,
    computation: () => untracked(this.line)?.note ?? '',
  });
  /** Une portion par ligne (petites commandes) ; une ligne modifiée garde sa quantité. */
  private readonly quantity = computed(() => this.line()?.quantity ?? 1);

  protected readonly missing = computed(() => {
    const product = this.product();
    return product ? missingGroups(product, this.state()) : [];
  });
  /**
   * Assistant des groupes d'options, par-dessus la fiche : ouvert d'office dès qu'un nouveau
   * produit commandable à options s'affiche (pas à la retouche d'une ligne, ni à une relecture
   * de la carte). Il se referme sur la fiche, où l'on remplace un ingrédient et ajoute au panier.
   */
  protected readonly wizardOpen = linkedSignal<string, boolean>({
    source: () => {
      const product = this.product();
      const ready = !this.ligne() && !!product?.isAvailable && product.groups.length > 0;
      return `${this.id()}|${this.ligne() ?? ''}|${ready}`;
    },
    computation: (key) => key.endsWith('|true'),
  });
  private readonly customization = computed(() => {
    const product = this.product();
    if (!product) {
      return NO_CUSTOMIZATION;
    }
    const names = new Map(this.replacements().map((r) => [r.id, r.name]));
    return toCustomization(product, this.state(), (id) => names.get(id) ?? '');
  });
  protected readonly canAdd = computed(
    () => !!this.product()?.isAvailable && this.missing().length === 0,
  );
  protected readonly quote = quoteOf(() => {
    const product = this.product();
    if (!product || !this.canAdd()) {
      return undefined;
    }
    const { modifications, optionChoices } = this.customization();
    return [{ productId: product.id, quantity: this.quantity(), modifications, optionChoices }];
  });
  protected chosen(group: ChoiceGroup): string[] {
    return chosenLabels(group, this.state());
  }

  protected readonly issue = computed(() => this.quote.issues()[0]?.message ?? this.quote.error());

  constructor() {
    inject(RealtimeService).start();
    this.store.card.load();
  }

  protected async add(): Promise<void> {
    const product = this.product();
    if (!product || !this.canAdd()) {
      return;
    }
    this.wizardOpen.set(false);
    const line = this.line();
    if (line) {
      this.cart.customize(line.key, this.customization());
      this.cart.setNote(line.key, this.note());
      await this.close();
      return;
    }
    this.cart.addProduct(product, this.customization(), this.quantity(), this.note());
    await this.close();
  }

  /** Retour à la carte, qui referme le dialogue sans la faire défiler. */
  private async close(): Promise<void> {
    await this.router.navigate(['/commander'], { scroll: 'manual' });
  }
}
