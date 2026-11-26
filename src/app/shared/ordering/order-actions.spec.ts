import { OrderDetails, OrderStatus } from '../../core/api/generated';
import { availableActions } from './order-actions';
import { order, PICKUP } from '../testing';

const pickup = new Date(PICKUP).getTime();

const actions = (extra: Partial<OrderDetails>, now = pickup) =>
  availableActions(order(extra), now, 15);

describe('availableActions', () => {
  it("n'agit pas sur une commande en attente de paiement : elle expire seule", () => {
    expect(actions({ status: 'PendingPayment', isPaid: false })).toEqual({
      complete: false,
      noShow: false,
      cancel: false,
      refund: false,
    });
  });

  it.each<OrderStatus>(['Confirmed', 'InPreparation'])(
    'annule une commande %s sans la remettre',
    (status) => {
      const result = actions({ status });
      expect(result.cancel).toBe(true);
      expect(result.complete).toBe(false);
    },
  );

  it('remet une commande prête', () => {
    expect(actions({ status: 'Ready' })).toMatchObject({ complete: true, cancel: true });
  });

  it('propose « non venu » seulement après l’heure de retrait et le délai de grâce', () => {
    expect(actions({ status: 'Ready' }, pickup + 14 * 60_000).noShow).toBe(false);
    expect(actions({ status: 'Ready' }, pickup + 15 * 60_000).noShow).toBe(true);
    expect(actions({ status: 'Confirmed' }, pickup + 60 * 60_000).noShow).toBe(false);
  });

  it.each<OrderStatus>(['Completed', 'NoShow', 'Cancelled'])(
    'ne propose aucun geste de service sur une commande %s',
    (status) => {
      const result = actions({ status });
      expect(result.cancel || result.complete).toBe(false);
    },
  );

  it('rembourse une commande close payée en ligne, ou dont le remboursement a échoué', () => {
    const paid = {
      payments: [
        {
          id: 'p1',
          amountCents: 1850,
          method: 'SumupOnline' as const,
          status: 'Successful' as const,
        },
      ],
    };
    expect(actions({ ...paid, status: 'NoShow' }).refund).toBe(true);
    expect(actions({ ...paid, status: 'Completed' }).refund).toBe(false);
    expect(actions({ status: 'Cancelled', paymentIssue: 'Remboursement en échec' }).refund).toBe(
      true,
    );
    expect(actions({ status: 'Cancelled' }).refund).toBe(false);
  });
});
