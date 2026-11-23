import { OrderDetails, OrderStatus } from '../../core/api/generated';
import { availableActions } from './order-actions';
import { order, PICKUP } from './testing';

const pickup = new Date(PICKUP).getTime();

const actions = (extra: Partial<OrderDetails>, now = pickup) =>
  availableActions(order(extra), now, 15);

describe('availableActions', () => {
  it('propose accepter et refuser pour une commande à valider, sans encaissement ni annulation', () => {
    expect(actions({ status: 'AwaitingApproval', channel: 'Online' })).toEqual({
      accept: true,
      refuse: true,
      collect: false,
      complete: false,
      collectBeforeHandover: false,
      noShow: false,
      cancel: false,
      refund: false,
    });
  });

  it.each<OrderStatus>(['Confirmed', 'InPreparation'])(
    'encaisse et annule une commande %s non payée',
    (status) => {
      const result = actions({ status });
      expect(result.collect).toBe(true);
      expect(result.cancel).toBe(true);
      expect(result.complete).toBe(false);
    },
  );

  it("ne propose pas d'encaissement pour une commande payée en ligne", () => {
    expect(actions({ paymentChoice: 'Online', isPaid: true }).collect).toBe(false);
  });

  it('remet une commande prête et payée, sinon demande de l’encaisser', () => {
    expect(actions({ status: 'Ready', isPaid: true })).toMatchObject({
      complete: true,
      collectBeforeHandover: false,
      collect: false,
    });
    expect(actions({ status: 'Ready' })).toMatchObject({
      complete: false,
      collectBeforeHandover: true,
      collect: true,
    });
  });

  it('propose « non venu » seulement après l’heure de retrait et le délai de grâce', () => {
    expect(actions({ status: 'Ready' }, pickup + 14 * 60_000).noShow).toBe(false);
    expect(actions({ status: 'Ready' }, pickup + 15 * 60_000).noShow).toBe(true);
    expect(actions({ status: 'Confirmed' }, pickup + 60 * 60_000).noShow).toBe(false);
  });

  it.each<OrderStatus>(['Completed', 'NoShow', 'Refused', 'Cancelled'])(
    'ne propose aucun geste de service sur une commande %s',
    (status) => {
      const result = actions({ status });
      expect(result.collect || result.cancel || result.complete || result.accept).toBe(false);
    },
  );

  it('rembourse une commande close payée en ligne, ou dont le remboursement a échoué', () => {
    const paid = {
      paymentChoice: 'Online' as const,
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
