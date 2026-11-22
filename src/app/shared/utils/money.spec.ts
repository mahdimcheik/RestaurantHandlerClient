import { centsToInput, formatEuros, parseEuros } from './money';

describe('montants en euros', () => {
  it('convertit une saisie en centimes', () => {
    expect(parseEuros('12,50')).toBe(1250);
    expect(parseEuros('12.5')).toBe(1250);
    expect(parseEuros(' 3 ')).toBe(300);
    expect(parseEuros('0,05')).toBe(5);
  });

  it('refuse ce qui n’est pas un montant positif', () => {
    expect(parseEuros('')).toBeNull();
    expect(parseEuros('-2')).toBeNull();
    expect(parseEuros('1,234')).toBeNull();
    expect(parseEuros('douze')).toBeNull();
  });

  it('pré-remplit et affiche un montant', () => {
    expect(centsToInput(1250)).toBe('12,50');
    expect(centsToInput(0)).toBe('0,00');
    expect(formatEuros(1250).replace(/\s/g, ' ')).toBe('12,50 €');
  });
});
