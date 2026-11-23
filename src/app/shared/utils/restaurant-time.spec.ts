import { formatLocal, formatTime, nextDay, previousDay, splitMoment } from './restaurant-time';

describe('restaurant-time', () => {
  it('affiche l’heure de Paris, heure d’été comme d’hiver', () => {
    expect(formatTime('2026-07-01T12:30:00Z')).toBe('14:30');
    expect(formatTime('2026-01-15T12:30:00Z')).toBe('13:30');
  });

  it('ne précise le jour que s’il ne s’agit pas d’aujourd’hui', () => {
    const now = new Date('2026-11-23T10:00:00Z');
    expect(splitMoment('2026-11-23T17:30:00Z', now)).toEqual({ day: null, time: '18:30' });
    expect(splitMoment('2026-11-24T17:30:00Z', now)).toEqual({ day: 'mardi', time: '18:30' });
  });

  it('lit les dates locales sans les décaler', () => {
    expect(formatLocal('2026-12-25T00:00:00')).not.toMatch(/\d{2}:\d{2}/);
    expect(formatLocal('2026-12-25T00:00:00')).toContain('25');
    expect(formatLocal('2026-12-25T19:00:00')).toContain('19:00');
  });

  it('passe au jour suivant ou précédent, fin de mois comprise', () => {
    expect(nextDay('2026-12-31')).toBe('2027-01-01');
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
  });
});
