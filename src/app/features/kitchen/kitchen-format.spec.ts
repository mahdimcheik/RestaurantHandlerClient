import { order } from '../../shared/testing';
import { modificationView, newcomers, splitColumns } from './kitchen-format';

describe('kitchen-format', () => {
  it('répartit la file en deux colonnes sans changer son ordre', () => {
    const queue = [
      order({ id: 'a', status: 'InPreparation' }),
      order({ id: 'b', status: 'Confirmed' }),
      order({ id: 'c', status: 'InPreparation' }),
      order({ id: 'd', status: 'Confirmed' }),
    ];
    const { todo, cooking } = splitColumns(queue);
    expect(todo.map((o) => o.id)).toEqual(['b', 'd']);
    expect(cooking.map((o) => o.id)).toEqual(['a', 'c']);
  });

  it('repère les commandes jamais vues', () => {
    const seen = new Set(['a', 'b']);
    const current = [order({ id: 'b' }), order({ id: 'c' })];
    expect(newcomers(seen, current).map((o) => o.id)).toEqual(['c']);
  });

  it('met en évidence un retrait et affiche la quantité des suppléments', () => {
    expect(
      modificationView({ type: 'Remove', label: 'Sans oignons', quantity: 1, unitPriceCents: 0 }),
    ).toEqual({ text: 'Sans oignons', icon: 'remove', strong: true });
    expect(
      modificationView({ type: 'Supplement', label: 'Bacon', quantity: 2, unitPriceCents: 150 }),
    ).toEqual({ text: 'Bacon ×2', icon: 'plus', strong: false });
    expect(
      modificationView({ type: 'Choice', label: 'Pain : Pita', quantity: 1, unitPriceCents: 0 }),
    ).toEqual({ text: 'Pain : Pita', icon: null, strong: false });
  });
});
