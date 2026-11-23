import {
  DayOfWeek,
  ManageStatsProductsGet$Params,
  PeakHoursBucket,
  StatsPeriod,
} from '../../core/api/generated';
import { WEEK } from '../../shared/utils/week';

export const PERIODS: readonly StatsPeriod[] = ['Day', 'Week', 'Month', 'Custom'];
export const BUCKETS = [30, 15] as const;
export type BucketMinutes = (typeof BUCKETS)[number];
export type DayFilter = DayOfWeek | 'all';

/** Période demandée, telle que lue dans l'adresse. */
export interface PeriodChoice {
  period: StatsPeriod;
  /** Jour de référence (jour, semaine, mois) ou début de la plage libre, « AAAA-MM-JJ ». */
  from: string;
  /** Fin incluse de la plage libre. */
  to: string;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const isDay = (value: string | undefined): value is string =>
  !!value && ISO_DAY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** Lit la période dans les paramètres d'adresse ; toute valeur invalide retombe sur aujourd'hui. */
export function readPeriod(
  period: string | undefined,
  from: string | undefined,
  to: string | undefined,
  today: string,
): PeriodChoice {
  const kind = PERIODS.find((p) => p === period) ?? 'Day';
  const start = isDay(from) ? from : today;
  const end = isDay(to) && to >= start ? to : start;
  return { period: kind, from: start, to: kind === 'Custom' ? end : start };
}

/** Paramètres de l'API : la semaine et le mois sont résolus par le serveur depuis `From`. */
export function periodParams(choice: PeriodChoice): ManageStatsProductsGet$Params {
  return choice.period === 'Custom'
    ? { Period: 'Custom', From: choice.from, To: choice.to }
    : { Period: choice.period, From: choice.from };
}

export function readBucket(value: string | undefined): BucketMinutes {
  return Number(value) === 15 ? 15 : 30;
}

export function readDay(value: string | undefined): DayFilter {
  return WEEK.find((day) => day === value) ?? 'all';
}

/** Ligne affichée des heures de pointe. */
export interface PeakRow {
  /** « HH:MM », début de la tranche. */
  start: string;
  orders: number;
  revenueCents: number;
  averagePreparationMinutes: number | null;
  /** Part de la tranche la plus chargée, de 0 à 100 (longueur de la barre). */
  share: number;
}

/**
 * Tranches d'un jour de semaine, ou de toute la période (« all ») : commandes et CA additionnés
 * par heure de début, préparation moyenne pondérée par les commandes mesurées. Simple mise en
 * forme des chiffres de l'API, qui reste la référence.
 */
export function peakRows(buckets: readonly PeakHoursBucket[], day: DayFilter): PeakRow[] {
  const byStart = new Map<
    string,
    { orders: number; revenueCents: number; prepWeight: number; prepSum: number }
  >();
  for (const bucket of buckets) {
    if (day !== 'all' && bucket.dayOfWeek !== day) {
      continue;
    }
    const start = bucket.start.slice(0, 5);
    const row = byStart.get(start) ?? { orders: 0, revenueCents: 0, prepWeight: 0, prepSum: 0 };
    row.orders += bucket.orders;
    row.revenueCents += bucket.revenueCents;
    if (bucket.averagePreparationMinutes != null) {
      row.prepWeight += bucket.orders;
      row.prepSum += bucket.averagePreparationMinutes * bucket.orders;
    }
    byStart.set(start, row);
  }
  const rows = [...byStart.entries()].sort(([a], [b]) => a.localeCompare(b));
  const busiest = Math.max(0, ...rows.map(([, row]) => row.orders));
  return rows.map(([start, row]) => ({
    start,
    orders: row.orders,
    revenueCents: row.revenueCents,
    averagePreparationMinutes: row.prepWeight > 0 ? row.prepSum / row.prepWeight : null,
    share: busiest > 0 ? Math.round((row.orders / busiest) * 100) : 0,
  }));
}

/** « 12:00 » + 30 → « 12:00 – 12:30 ». */
export function bucketLabel(start: string, minutes: number): string {
  const [hours, mins] = start.split(':').map(Number);
  const total = (hours * 60 + mins + minutes) % (24 * 60);
  const end = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  return `${start} – ${end}`;
}

const minutesFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/** 12.25 → « 12,3 min » ; vide sans mesure. */
export function formatMinutes(value: number | null | undefined): string {
  return value == null ? '—' : `${minutesFormat.format(value)} min`;
}
