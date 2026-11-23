import { OrderDetails, OrderSummary } from '../core/api/generated';
import { ComponentFixture } from '@angular/core/testing';

const root = (fixture: ComponentFixture<unknown>) => fixture.nativeElement as HTMLElement;

/** Champ associé au libellé exact (texte du <label>, espaces ignorés). */
export function control<T extends HTMLElement = HTMLInputElement>(
  fixture: ComponentFixture<unknown>,
  label: string,
  index = 0,
): T {
  const labels = [...root(fixture).querySelectorAll('label')].filter(
    (element) => element.textContent?.trim() === label,
  );
  const id = labels[index]?.htmlFor;
  const found = id ? root(fixture).querySelector<T>(`#${id}`) : null;
  if (!found) {
    throw new Error(`Champ « ${label} » introuvable.`);
  }
  return found;
}

/** Saisit une valeur dans le champ du libellé donné. */
export function fill(
  fixture: ComponentFixture<unknown>,
  label: string,
  value: string,
  index = 0,
): void {
  const input = control<HTMLInputElement | HTMLSelectElement>(fixture, label, index);
  input.value = value;
  // Comme un navigateur : `input` à chaque saisie, et `change` en plus pour une liste.
  input.dispatchEvent(new Event('input'));
  if (input instanceof HTMLSelectElement) {
    input.dispatchEvent(new Event('change'));
  }
}

export function submitForm(fixture: ComponentFixture<unknown>): void {
  root(fixture)
    .querySelector('form')
    ?.dispatchEvent(new Event('submit', { cancelable: true }));
}

export function clickButton(fixture: ComponentFixture<unknown>, text: string): void {
  const button = [...root(fixture).querySelectorAll('button')].find(
    (element) => element.textContent?.trim() === text || element.title === text,
  );
  if (!button) {
    throw new Error(`Bouton « ${text} » introuvable.`);
  }
  button.click();
}

export const text = (fixture: ComponentFixture<unknown>) => root(fixture).textContent ?? '';

/** Réponse de l'API pour les tests. */
export const envelope = <T>(data: T) => ({ data, message: 'OK', status: 200 });

/** jsdom n'implémente pas toujours `<dialog>` : ouverture et fermeture simulées. */
export function polyfillDialog(): void {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
}

/** Heure de retrait des commandes de test. */
export const PICKUP = '2026-11-23T12:00:00+01:00';

export function order(extra: Partial<OrderDetails> = {}): OrderDetails {
  return {
    id: 'o1',
    orderNumber: 1042,
    dailyNumber: 12,
    channel: 'Counter',
    status: 'Confirmed',
    paymentChoice: 'OnSite',
    pickupMode: 'Asap',
    pickupAt: PICKUP,
    serviceDate: '2026-11-23',
    createdAt: PICKUP,
    isPaid: false,
    paidCents: 0,
    totalCents: 1850,
    items: [],
    history: [],
    payments: [],
    vat: [],
    ...extra,
  };
}

export function summary(extra: Partial<OrderSummary> = {}): OrderSummary {
  return {
    id: 'o1',
    orderNumber: 1042,
    dailyNumber: 12,
    channel: 'Counter',
    status: 'Confirmed',
    paymentChoice: 'OnSite',
    pickupMode: 'Asap',
    pickupAt: PICKUP,
    serviceDate: '2026-11-23',
    createdAt: PICKUP,
    isPaid: false,
    totalCents: 1850,
    ...extra,
  };
}
