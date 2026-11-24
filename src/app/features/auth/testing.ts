import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture } from '@angular/core/testing';

/** Saisit une valeur dans le n-ième champ de saisie du composant. */
export function typeInto(fixture: ComponentFixture<unknown>, index: number, value: string): void {
  const input = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>(
    'input:not([type=checkbox])',
  )[index];
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

export function submitForm(fixture: ComponentFixture<unknown>): void {
  (fixture.nativeElement as HTMLElement)
    .querySelector('form')
    ?.dispatchEvent(new Event('submit', { cancelable: true }));
}

export const text = (fixture: ComponentFixture<unknown>) =>
  (fixture.nativeElement as HTMLElement).textContent ?? '';

/** Répond à la lecture des informations du restaurant faite par la barre du haut. */
export function flushRestaurantInfo(http: HttpTestingController): void {
  for (const request of http.match('/restaurant/info')) {
    request.flush({
      message: '',
      status: 200,
      data: { tradeName: 'Chez Nino', hours: [], upcomingClosures: [] },
    });
  }
}
