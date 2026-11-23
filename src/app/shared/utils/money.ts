import { Pipe, PipeTransform } from '@angular/core';

const EUROS = /^\d{1,6}(?:[.,]\d{1,2})?$/;

/** « 12,50 », « 12.5 » ou « 12 » → 1250 centimes ; null si la saisie n'est pas un montant. */
export function parseEuros(text: string): number | null {
  const value = text.trim().replace(/\s/g, '');
  if (!EUROS.test(value)) {
    return null;
  }
  const [units, decimals = ''] = value.replace(',', '.').split('.');
  return Number(units) * 100 + Number(decimals.padEnd(2, '0'));
}

/** 1250 → « 12,50 », pour pré-remplir un champ de saisie. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

const format = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/** 1250 → « 12,50 € ». */
export function formatEuros(cents: number): string {
  return format.format(cents / 100);
}

@Pipe({ name: 'euros' })
export class EurosPipe implements PipeTransform {
  transform(cents: number | null | undefined): string {
    return cents == null ? '' : formatEuros(cents);
  }
}

const rateFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** Taux de TVA : 5.5 → « 5,5 ». */
@Pipe({ name: 'rate' })
export class RatePipe implements PipeTransform {
  transform(rate: number | null | undefined): string {
    return rate == null ? '' : rateFormat.format(rate);
  }
}
