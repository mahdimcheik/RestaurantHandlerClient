import { Pipe, PipeTransform } from '@angular/core';

/** Fuseau du restaurant : les heures de l'API (horaires, fermetures) y sont exprimées. */
export const RESTAURANT_TIME_ZONE = 'Europe/Paris';

const timeFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: RESTAURANT_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
});
const dayFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: RESTAURANT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: RESTAURANT_TIME_ZONE,
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** Instant de l'API (avec décalage) en heure du restaurant : « 14:30 ». */
export function formatTime(instant: string): string {
  return timeFormat.format(new Date(instant));
}

const weekdayFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: RESTAURANT_TIME_ZONE,
  weekday: 'long',
});

/**
 * Instant proche en heure du restaurant : l'heure, et le jour de la semaine quand ce n'est
 * pas le jour même (`day` vaut alors « lundi », sinon `null`).
 */
export function splitMoment(
  instant: string,
  now: Date = new Date(),
): { day: string | null; time: string } {
  const date = new Date(instant);
  return {
    day: dayFormat.format(date) === dayFormat.format(now) ? null : weekdayFormat.format(date),
    time: timeFormat.format(date),
  };
}

/** Instant de l'API (historique) en date et heure du restaurant. */
export function formatDateTime(instant: string): string {
  return dateTimeFormat.format(new Date(instant));
}

const localDateFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const localDateTimeFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Date et heure locales sans fuseau (« 2026-12-25T14:00:00 »), lues comme UTC pour ne rien décaler. */
function parseLocal(local: string): Date {
  return new Date(`${local.slice(0, 19)}Z`);
}

/**
 * Date et heure locales du restaurant, sans fuseau, telles que l'API les donne pour les
 * fermetures ; minuit n'affiche que la date.
 */
export function formatLocal(local: string): string {
  const date = parseLocal(local);
  return date.getUTCHours() === 0 && date.getUTCMinutes() === 0
    ? localDateFormat.format(date)
    : localDateTimeFormat.format(date);
}

const isoDayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: RESTAURANT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Jour du restaurant (« AAAA-MM-JJ ») à l'instant donné. */
export function restaurantDay(now: Date = new Date()): string {
  return isoDayFormat.format(now);
}

/** Jour suivant d'une date « AAAA-MM-JJ ». */
export function nextDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** Jour précédent d'une date « AAAA-MM-JJ ». */
export function previousDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/** `formatLocal` pour les gabarits. */
@Pipe({ name: 'localDateTime' })
export class LocalDateTimePipe implements PipeTransform {
  transform(local: string | null | undefined): string {
    return local ? formatLocal(local) : '';
  }
}

/** `formatDateTime` pour les gabarits. */
@Pipe({ name: 'restaurantDateTime' })
export class RestaurantDateTimePipe implements PipeTransform {
  transform(instant: string | null | undefined): string {
    return instant ? formatDateTime(instant) : '';
  }
}

/** `formatTime` pour les gabarits : « 14:30 ». */
@Pipe({ name: 'restaurantTime' })
export class RestaurantTimePipe implements PipeTransform {
  transform(instant: string | null | undefined): string {
    return instant ? formatTime(instant) : '';
  }
}
