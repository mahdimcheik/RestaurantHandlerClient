import { computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { switchMap, timer } from 'rxjs';
import { CartLineDto } from '../../../core/api/generated';
import { apiErrorMessage, cartIssues } from '../../../core/http/api-error';
import { OrdersService } from '../../../shared/services/orders.service';

/**
 * Devis du serveur (R2), demandé 300 ms après le dernier changement des lignes. À créer dans un
 * contexte d'injection. Un panier refusé (409) donne ses lignes en cause dans `issues`.
 */
export function quoteOf(lines: () => CartLineDto[] | undefined) {
  const orders = inject(OrdersService);
  const resource = rxResource({
    params: () => {
      const value = lines();
      return value && value.length > 0 ? { lines: value } : undefined;
    },
    stream: ({ params }) => timer(300).pipe(switchMap(() => orders.quote(params))),
  });
  return {
    resource,
    /** Total TTC une fois le devis à jour, sinon `null` (calcul en cours, erreur). */
    total: computed(() =>
      resource.hasValue() && !resource.isLoading() ? resource.value().totalCents : null,
    ),
    lineTotals: computed(
      () =>
        new Map(
          (resource.hasValue() ? resource.value().lines : []).map((line) => [
            line.index,
            line.lineTotalCents,
          ]),
        ),
    ),
    vat: computed(() => (resource.hasValue() ? resource.value().vat : [])),
    issues: computed(() => cartIssues(resource.error())),
    error: computed(() => (resource.error() ? apiErrorMessage(resource.error()) : '')),
  };
}
