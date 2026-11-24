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
  Monday: 'Lundi',
  Tuesday: 'Mardi',
  Wednesday: 'Mercredi',
  Thursday: 'Jeudi',
  Friday: 'Vendredi',
  Saturday: 'Samedi',
  Sunday: 'Dimanche',
};
