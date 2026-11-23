import { PeakHoursBucket } from '../../core/api/generated';
import {
  bucketLabel,
  formatMinutes,
  peakRows,
  periodParams,
  readBucket,
  readDay,
  readPeriod,
} from './reports-format';

const bucket = (extra: Partial<PeakHoursBucket>): PeakHoursBucket => ({
  dayOfWeek: 'Monday',
  start: '12:00:00',
  orders: 1,
  revenueCents: 1000,
  ...extra,
});

describe('reports-format', () => {
  it('lit la période de l’adresse et retombe sur le jour même si elle est invalide', () => {
    expect(readPeriod(undefined, undefined, undefined, '2026-11-23')).toEqual({
      period: 'Day',
      from: '2026-11-23',
      to: '2026-11-23',
    });
    expect(readPeriod('Week', '2026-11-18', '2026-12-01', '2026-11-23')).toEqual({
      period: 'Week',
      from: '2026-11-18',
      to: '2026-11-18',
    });
    expect(readPeriod('Custom', '2026-11-01', '2026-11-15', '2026-11-23').to).toBe('2026-11-15');
    expect(readPeriod('Custom', '2026-11-10', '2026-11-01', '2026-11-23').to).toBe('2026-11-10');
    expect(readPeriod('Year', 'hier', undefined, '2026-11-23').period).toBe('Day');
    expect(readPeriod('Day', '2026-13-45', undefined, '2026-11-23').from).toBe('2026-11-23');
  });

  it('n’envoie la fin qu’avec une plage libre', () => {
    expect(periodParams({ period: 'Month', from: '2026-11-23', to: '2026-11-23' })).toEqual({
      Period: 'Month',
      From: '2026-11-23',
    });
    expect(periodParams({ period: 'Custom', from: '2026-11-01', to: '2026-11-15' })).toEqual({
      Period: 'Custom',
      From: '2026-11-01',
      To: '2026-11-15',
    });
  });

  it('lit la tranche et le jour de semaine', () => {
    expect(readBucket('15')).toBe(15);
    expect(readBucket('45')).toBe(30);
    expect(readDay('Friday')).toBe('Friday');
    expect(readDay('vendredi')).toBe('all');
  });

  it('additionne les jours par tranche et pondère la préparation par les commandes', () => {
    const rows = peakRows(
      [
        bucket({
          dayOfWeek: 'Monday',
          start: '12:30:00',
          orders: 1,
          averagePreparationMinutes: 10,
        }),
        bucket({
          dayOfWeek: 'Tuesday',
          start: '12:30:00',
          orders: 3,
          averagePreparationMinutes: 14,
        }),
        bucket({
          dayOfWeek: 'Monday',
          start: '12:00:00',
          orders: 2,
          averagePreparationMinutes: null,
        }),
      ],
      'all',
    );
    expect(rows.map((row) => row.start)).toEqual(['12:00', '12:30']);
    expect(rows[1]).toMatchObject({ orders: 4, revenueCents: 2000, share: 100 });
    expect(rows[1].averagePreparationMinutes).toBe(13);
    expect(rows[0]).toMatchObject({ orders: 2, share: 50, averagePreparationMinutes: null });

    expect(peakRows(rows.length ? [bucket({ dayOfWeek: 'Tuesday' })] : [], 'Monday')).toEqual([]);
  });

  it('met en forme les tranches et les minutes', () => {
    expect(bucketLabel('12:00', 30)).toBe('12:00 – 12:30');
    expect(bucketLabel('23:45', 15)).toBe('23:45 – 00:00');
    expect(formatMinutes(12.25)).toBe('12,3 min');
    expect(formatMinutes(null)).toBe('—');
  });
});
