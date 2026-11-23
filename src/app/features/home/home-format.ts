import { OpeningRangeDto } from '../../core/api/generated';
import { DAY_NAMES, WEEK } from '../../shared/utils/week';

export interface DayHours {
  day: string;
  /** « 11:30 – 14:30, 18:30 – 22:00 », ou `null` si fermé. */
  ranges: string | null;
}

/** « 11:30:00 » → « 11:30 ». */
const hhmm = (time: string) => time.slice(0, 5);

/** Horaires de la semaine, du lundi au dimanche, plages dans l'ordre de la journée. */
export function weeklyHours(hours: readonly OpeningRangeDto[]): DayHours[] {
  return WEEK.map((day) => {
    const ranges = hours
      .filter((range) => range.dayOfWeek === day)
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((range) => `${hhmm(range.start)} – ${hhmm(range.end)}`);
    return { day: DAY_NAMES[day], ranges: ranges.length > 0 ? ranges.join(', ') : null };
  });
}
