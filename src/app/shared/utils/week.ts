import { DayOfWeek } from '../../core/api/generated';

/** Jours de la semaine, du lundi au dimanche. */
export const WEEK: readonly DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/** Nom affiché de chaque jour. */
export const DAY_NAMES: Record<DayOfWeek, string> = {
  Monday: $localize`:@@day.monday:Lundi`,
  Tuesday: $localize`:@@day.tuesday:Mardi`,
  Wednesday: $localize`:@@day.wednesday:Mercredi`,
  Thursday: $localize`:@@day.thursday:Jeudi`,
  Friday: $localize`:@@day.friday:Vendredi`,
  Saturday: $localize`:@@day.saturday:Samedi`,
  Sunday: $localize`:@@day.sunday:Dimanche`,
};
