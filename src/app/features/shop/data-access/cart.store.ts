import { DOCUMENT, effect, inject, Service, signal, untracked } from '@angular/core';
import { CartIssueDto } from '../../../core/api/generated';
import { Cart, OrderLine } from '../../../shared/ordering/cart';
import { PublicStore } from '../../../shared/services/public-store.service';

export const CART_STORAGE_KEY = 'cart.v1';

interface StoredCart {
  version: 1;
  key: string;
  lines: OrderLine[];
}

function isStoredCart(value: unknown): value is StoredCart {
  return (
    !!value &&
    typeof value === 'object' &&
    'version' in value &&
    value.version === 1 &&
    'key' in value &&
    typeof value.key === 'string' &&
    'lines' in value &&
    Array.isArray(value.lines)
  );
}

/**
 * Panier de la commande en ligne, conservé sur l'appareil (rechargement, fermeture de l'onglet :
 * US-E04-1). On n'y garde que des identifiants, des quantités et des libellés : les prix viennent
 * toujours du devis du serveur (R2). Une fois la carte lue, les lignes dont le produit ou le menu
 * a disparu sont retirées et signalées. Toute modification change la clé d'idempotence : un
 * panier différent est une autre commande.
 */
@Service()
export class CartStore extends Cart {
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage;
  private readonly publicStore = inject(PublicStore);

  /** Lignes refusées par le serveur à la dernière validation, par index de ligne. */
  readonly issues = signal<CartIssueDto[]>([]);
  /** Lignes retirées car absentes de la carte, à annoncer. */
  readonly removed = signal<string[]>([]);

  constructor() {
    super();
    this.restore();
    effect(() => {
      const card = this.publicStore.card.value();
      const products = this.publicStore.products();
      const menus = this.publicStore.menus();
      if (card) {
        untracked(() => this.prune(products, menus));
      }
    });
  }

  /** Après une commande créée : panier vidé, nouvelle clé. */
  override clear(): void {
    super.clear();
    this.issues.set([]);
  }

  protected override changed(): void {
    this.key.set(crypto.randomUUID());
    this.issues.set([]);
    this.save();
  }

  private prune(products: ReadonlyMap<string, unknown>, menus: ReadonlyMap<string, unknown>): void {
    const gone = this.lines().filter((line) =>
      line.kind === 'product'
        ? !products.has(line.productId)
        : !menus.has(line.menuId) || line.choices.some((choice) => !products.has(choice.productId)),
    );
    if (gone.length === 0) {
      return;
    }
    this.items.update((lines) => lines.filter((line) => !gone.includes(line)));
    this.removed.set(gone.map((line) => line.name));
    this.changed();
  }

  private restore(): void {
    try {
      const raw = this.storage?.getItem(CART_STORAGE_KEY);
      const stored: unknown = raw ? JSON.parse(raw) : null;
      if (isStoredCart(stored)) {
        this.items.set(stored.lines);
        this.key.set(stored.key);
      }
    } catch {
      // Stockage indisponible (navigation privée) ou contenu illisible : panier vide.
    }
  }

  private save(): void {
    try {
      if (this.lines().length === 0) {
        this.storage?.removeItem(CART_STORAGE_KEY);
        return;
      }
      const stored: StoredCart = { version: 1, key: this.idempotencyKey(), lines: this.lines() };
      this.storage?.setItem(CART_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Stockage plein ou refusé : le panier reste en mémoire pour cette visite.
    }
  }
}
