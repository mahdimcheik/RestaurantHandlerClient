import { isPaymentUrl } from './payment-url';

describe('isPaymentUrl', () => {
  it('n’accepte qu’une adresse absolue en https', () => {
    expect(isPaymentUrl('https://checkout.sumup.com/pay/abc')).toBe(true);
    expect(isPaymentUrl('http://checkout.sumup.com/pay/abc')).toBe(false);
    expect(isPaymentUrl('javascript:alert(1)')).toBe(false);
    expect(isPaymentUrl('/commandes/1')).toBe(false);
    expect(isPaymentUrl(null)).toBe(false);
  });
});
