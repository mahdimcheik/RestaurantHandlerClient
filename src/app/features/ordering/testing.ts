import { ProductDetails } from '../../core/api/generated';

export { fakeRealtime } from '../../core/realtime/testing';
export { order, PICKUP, summary } from '../../shared/testing';

export function product(
  id: string,
  name: string,
  extra: Partial<ProductDetails> = {},
): ProductDetails {
  return {
    id,
    categoryId: 'c1',
    name,
    kind: 'Dish',
    priceCents: 900,
    vatRate: 10,
    position: 0,
    isActive: true,
    isArchived: false,
    isAvailable: true,
    composition: { ingredients: [] },
    optionGroups: [],
    ...extra,
  };
}
