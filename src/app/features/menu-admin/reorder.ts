import { signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { apiErrorMessage } from '../../core/http/api-error';

/** Copie de la liste où l'élément `index` a échangé sa place avec son voisin `index + offset`. */
export function moveItem<T>(items: readonly T[], index: number, offset: -1 | 1): T[] {
  const target = index + offset;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return [...items];
  }
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * Réordonnancement d'une liste par l'API, un déplacement à la fois. L'API exige la liste complète
 * des éléments non archivés ; en cas de refus (ajout ou archivage concurrent : 409), `reload`
 * recharge la liste pour repartir de l'état du serveur.
 */
export class ListOrder {
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  constructor(
    private readonly send: (orderedIds: string[]) => Observable<unknown>,
    private readonly reload: () => void,
  ) {}

  async move(items: readonly Named[], index: number, offset: -1 | 1): Promise<void> {
    const item = items[index];
    if (!item || this.busy()) {
      return;
    }
    this.error.set('');
    this.notice.set('');
    this.busy.set(true);
    try {
      const ids = moveItem(items, index, offset).map((entry) => entry.id);
      await firstValueFrom(this.send(ids), { defaultValue: undefined });
      const position = index + offset + 1;
      this.notice.set(`« ${itemName(item)} » déplacé en position ${position}.`);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
      this.reload();
    } finally {
      this.busy.set(false);
    }
  }
}

interface Named {
  id: string;
  name?: string;
  label?: string;
}

const itemName = (item: Named) => item.name ?? item.label ?? '';
