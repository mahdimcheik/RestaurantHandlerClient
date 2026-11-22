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
  input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input'));
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
