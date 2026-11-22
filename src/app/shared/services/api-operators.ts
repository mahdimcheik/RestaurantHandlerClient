import { map, MonoTypeOperatorFunction, Observable, OperatorFunction, tap } from 'rxjs';
import { ApiEnvelope, Cached } from './cached';

/** Extrait `data` d'une réponse de l'API ; erreur si le serveur n'en renvoie pas. */
export function unwrap<T>(): OperatorFunction<ApiEnvelope<T>, T> {
  return map((response) => {
    if (response.data == null) {
      throw new Error('Réponse de l’API sans données.');
    }
    return response.data;
  });
}

/** Ignore le corps de la réponse (suppressions). */
export function toVoid(): OperatorFunction<unknown, void> {
  return map(() => undefined);
}

/**
 * Recharge les caches touchés par une écriture, qu'elle réussisse ou échoue
 * (un échec, un 409 par exemple, signale souvent que le cache est périmé).
 */
export function refresh<T>(...caches: Cached<unknown>[]): MonoTypeOperatorFunction<T> {
  const reloadAll = () => caches.forEach((cache) => cache.reload());
  return (source: Observable<T>) => source.pipe(tap({ next: reloadAll, error: reloadAll }));
}

/** Page de résultats : les éléments et le nombre total côté serveur. */
export interface Page<T> {
  items: T[];
  count: number;
}

/** Extrait `data` et `count` d'une réponse de liste paginée. */
export function unwrapPage<T>(): OperatorFunction<
  ApiEnvelope<T[]> & { count?: number | null },
  Page<T>
> {
  return map((response) => {
    const items = response.data ?? [];
    return { items, count: response.count ?? items.length };
  });
}
