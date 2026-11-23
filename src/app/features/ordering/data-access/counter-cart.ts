import { computed, Injectable, signal } from '@angular/core';
import { CartLineDto, CartModificationDto, CartOptionChoiceDto } from '../../../core/api/generated';

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
}

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

export type CounterLine = ProductLine | MenuLine;

const isPlain = (customization: Customization) =>
  customization.modifications.length === 0 && customization.optionChoices.length === 0;

/** Lignes du panier au format de l'API (devis et commande). */
export function toCartLines(lines: readonly CounterLine[]): CartLineDto[] {
  return lines.map((line) =>
    line.kind === 'product'
      ? {
          productId: line.productId,
          quantity: line.quantity,
          modifications: line.customization.modifications,
          optionChoices: line.customization.optionChoices,
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
        },
  );
}

/**
 * Panier de la saisie comptoir, propre à l'écran. La clé d'idempotence est créée pour le
 * panier et **réutilisée** à chaque nouvel essai d'envoi ; elle change avec un panier vide.
 */
@Injectable()
export class CounterCart {
  private readonly items = signal<CounterLine[]>([]);
  private readonly key = signal(crypto.randomUUID());

  readonly lines = this.items.asReadonly();
  readonly idempotencyKey = this.key.asReadonly();
  readonly isEmpty = computed(() => this.items().length === 0);
  readonly itemCount = computed(() => this.items().reduce((sum, line) => sum + line.quantity, 0));
  /** Lignes au format de l'API, recalculées à chaque changement (devis). */
  readonly cartLines = computed(() => toCartLines(this.items()));

  /** Un produit sans personnalisation déjà présent voit sa quantité augmenter. */
  addProduct(
    product: { id: string; name: string },
    customization: Customization = NO_CUSTOMIZATION,
  ): void {
    const same = isPlain(customization)
      ? this.items().find(
          (line) =>
            line.kind === 'product' && line.productId === product.id && isPlain(line.customization),
        )
      : undefined;
    if (same) {
      this.setQuantity(same.key, same.quantity + 1);
      return;
    }
    this.append({
      kind: 'product',
      key: crypto.randomUUID(),
      productId: product.id,
      name: product.name,
      quantity: 1,
      customization,
    });
  }

  addMenu(menu: { id: string; name: string }, choices: MenuChoice[]): void {
    this.append({
      kind: 'menu',
      key: crypto.randomUUID(),
      menuId: menu.id,
      name: menu.name,
      quantity: 1,
      choices,
    });
  }

  /** Quantité nulle : la ligne est retirée. */
  setQuantity(key: string, quantity: number): void {
    this.items.update((lines) =>
      quantity <= 0
        ? lines.filter((line) => line.key !== key)
        : lines.map((line) => (line.key === key ? { ...line, quantity } : line)),
    );
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
  }

  replaceMenuChoices(key: string, choices: MenuChoice[]): void {
    this.items.update((lines) =>
      lines.map((line) => (line.key === key && line.kind === 'menu' ? { ...line, choices } : line)),
    );
  }

  /** Panier vidé (commande envoyée ou abandonnée) : nouvelle clé pour la suivante. */
  clear(): void {
    this.items.set([]);
    this.key.set(crypto.randomUUID());
  }

  private append(line: CounterLine): void {
    this.items.update((lines) => [...lines, line]);
  }
}
