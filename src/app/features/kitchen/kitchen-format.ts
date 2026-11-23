import { ModificationType, OrderDetails, OrderModificationDto } from '../../core/api/generated';
import { IconName } from '../../shared/ui/icon/icon';

export interface KitchenColumns {
  /** `Confirmée` : à commencer. */
  todo: OrderDetails[];
  /** `En préparation` : à terminer. */
  cooking: OrderDetails[];
}

/** Répartit la file de l'API (déjà triée par heure de retrait) en deux colonnes, ordre conservé. */
export function splitColumns(orders: readonly OrderDetails[]): KitchenColumns {
  return {
    todo: orders.filter((order) => order.status === 'Confirmed'),
    cooking: orders.filter((order) => order.status === 'InPreparation'),
  };
}

/** Commandes de `current` jamais vues auparavant. */
export function newcomers(
  seen: ReadonlySet<string>,
  current: readonly OrderDetails[],
): OrderDetails[] {
  return current.filter((order) => !seen.has(order.id));
}

const ICONS: Record<ModificationType, IconName | null> = {
  Remove: 'remove',
  Replace: 'forward',
  Supplement: 'plus',
  Choice: null,
};

export interface ModificationView {
  text: string;
  icon: IconName | null;
  /** Retrait d'un ingrédient : affiché en capitales, le plus visible. */
  strong: boolean;
}

/**
 * Personnalisation telle que la cuisine la lit : libellé du serveur (« Sans oignons »,
 * « Pain → Pita », « Taille : Grande »), quantité si plusieurs, icône selon le type.
 */
export function modificationView(modification: OrderModificationDto): ModificationView {
  const quantity = modification.quantity > 1 ? ` ×${modification.quantity}` : '';
  return {
    text: modification.label + quantity,
    icon: ICONS[modification.type],
    strong: modification.type === 'Remove',
  };
}
