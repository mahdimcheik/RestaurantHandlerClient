import { computed, signal } from '@angular/core';
import { CartLineDto, CartModificationDto, CartOptionChoiceDto } from '../../core/api/generated';

/** Personnalisation d'un produit : retraits, remplacements, choix d'options, et leur libellé. */
export interface Customization {
  modifications: CartModificationDto[];
  optionChoices: CartOptionChoiceDto[];
  /** « Sans oignon », « Tomate → Poulet », « Coca × 2 » : affichés sur le ticket. */
  labels: string[];
}

export const NO_CUSTOMIZATION: Customization = { modifications: [], optionChoices: [], labels: [] };

/** Produit choisi pour un emplacement de menu. */
export interface MenuChoice {
  slotId: string;
  productId: string;
  productName: string;
  customization: Customization;
}

interface BaseLine {
  /** Identifiant local et stable de la ligne (suivi des boucles, retouches). */
  key: string;
  name: string;
  quantity: number;
  /** Précision du client pour la cuisine (« bien cuite »), sans effet sur le prix. */
  note?: string;
}

/** Longueur maximale d'une note d'article (`CartPolicy.MaxNoteLength` côté API). */
export const MAX_LINE_NOTE_LENGTH = 200;

const cleanNote = (note: string | undefined) => note?.trim() || undefined;

export interface ProductLine extends BaseLine {
  kind: 'product';
  productId: string;
  customization: Customization;
}

export interface MenuLine extends BaseLine {
  kind: 'menu';
  menuId: string;
  choices: MenuChoice[];
}

export type OrderLine = ProductLine | MenuLine;

const isPlain = (customization: Customization) =>
  customization.modifications.length === 0 && customization.optionChoices.length === 0;

/** Lignes du panier au format de l'API (devis et commande). */
export function toCartLines(lines: readonly OrderLine[]): CartLineDto[] {
  return lines.map((line) =>
    line.kind === 'product'
      ? {
          productId: line.productId,
          quantity: line.quantity,
          modifications: line.customization.modifications,
          optionChoices: line.customization.optionChoices,
          note: line.note,
        }
      : {
          menuId: line.menuId,
          quantity: line.quantity,
          choices: line.choices.map((choice) => ({
            slotId: choice.slotId,
            productId: choice.productId,
            modifications: choice.customization.modifications,
            optionChoices: choice.customization.optionChoices,
          })),
          note: line.note,
        },
  );
}

/** Personnalisations d'une ligne, en clair (ticket, panier). */
export function lineLabels(line: OrderLine): string[] {
  return line.kind === 'product'
    ? line.customization.labels
    : line.choices.map((choice) =>
        choice.customization.labels.length > 0
          ? `${choice.productName} (${choice.customization.labels.join(', ')})`
          : choice.productName,
      );
}

/**
 * Panier : lignes et clé d'idempotence. La clé est **réutilisée** à chaque nouvel essai d'envoi
 * et ne change qu'avec un panier vidé, si bien qu'un rejeu ne crée jamais deux commandes (R10).
 */
export class Cart {
  protected readonly items = signal<OrderLine[]>([]);
  protected readonly key = signal<string>(crypto.randomUUID());

  readonly lines = this.items.asReadonly();
  readonly idempotencyKey = this.key.asReadonly();
  readonly isEmpty = computed(() => this.items().length === 0);
  readonly itemCount = computed(() => this.items().reduce((sum, line) => sum + line.quantity, 0));
  /** Lignes au format de l'API, recalculées à chaque changement (devis). */
  readonly cartLines = computed(() => toCartLines(this.items()));

  /** Un produit sans personnalisation ni note déjà présent voit sa quantité augmenter. */
  addProduct(
    product: { id: string; name: string },
    customization: Customization = NO_CUSTOMIZATION,
    quantity = 1,
    note?: string,
  ): void {
    note = cleanNote(note);
    const same =
      isPlain(customization) && !note
        ? this.items().find(
            (line) =>
              line.kind === 'product' &&
              line.productId === product.id &&
              isPlain(line.customization) &&
              !line.note,
          )
        : undefined;
    if (same) {
      this.setQuantity(same.key, same.quantity + quantity);
      return;
    }
    this.append({
      kind: 'product',
      key: crypto.randomUUID(),
      productId: product.id,
      name: product.name,
      quantity,
      customization,
      note,
    });
  }

  addMenu(
    menu: { id: string; name: string },
    choices: MenuChoice[],
    quantity = 1,
    note?: string,
  ): void {
    this.append({
      kind: 'menu',
      key: crypto.randomUUID(),
      menuId: menu.id,
      name: menu.name,
      quantity,
      choices,
      note: cleanNote(note),
    });
  }

  setNote(key: string, note: string | undefined): void {
    this.items.update((lines) =>
      lines.map((line) => (line.key === key ? { ...line, note: cleanNote(note) } : line)),
    );
    this.changed();
  }

  /** Quantité nulle : la ligne est retirée. */
  setQuantity(key: string, quantity: number): void {
    this.items.update((lines) =>
      quantity <= 0
        ? lines.filter((line) => line.key !== key)
        : lines.map((line) => (line.key === key ? { ...line, quantity } : line)),
    );
    this.changed();
  }

  remove(key: string): void {
    this.setQuantity(key, 0);
  }

  customize(key: string, customization: Customization): void {
    this.items.update((lines) =>
      lines.map((line) =>
        line.key === key && line.kind === 'product' ? { ...line, customization } : line,
      ),
    );
    this.changed();
  }

  replaceMenuChoices(key: string, choices: MenuChoice[]): void {
    this.items.update((lines) =>
      lines.map((line) => (line.key === key && line.kind === 'menu' ? { ...line, choices } : line)),
    );
    this.changed();
  }

  /** Panier vidé (commande envoyée ou abandonnée) : nouvelle clé pour la suivante. */
  clear(): void {
    this.items.set([]);
    this.key.set(crypto.randomUUID());
    this.changed();
  }

  /** Appelé après chaque modification des lignes (persistance d'un panier dérivé). */
  protected changed(): void {}

  private append(line: OrderLine): void {
    this.items.update((lines) => [...lines, line]);
    this.changed();
  }
}
