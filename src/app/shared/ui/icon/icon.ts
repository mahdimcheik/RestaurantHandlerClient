import { Component, computed, input } from '@angular/core';

/** Tracés 24 × 24, dessinés au trait (`currentColor`). */
const PATHS = {
  dashboard: ['M3 3h7v9H3z', 'M14 3h7v5h-7z', 'M14 12h7v9h-7z', 'M3 16h7v5H3z'],
  categories: ['M4 5h16', 'M4 12h16', 'M4 19h16', 'M8 3v4', 'M14 10v4', 'M10 17v4'],
  products: ['M4 7l8-4 8 4v10l-8 4-8-4z', 'M4 7l8 4 8-4', 'M12 11v10'],
  menus: ['M4 4h16v16H4z', 'M8 9h8', 'M8 13h8', 'M8 17h5'],
  ingredients: ['M5 19C5 11 11 5 19 5c0 8-6 14-14 14z', 'M5 19l8-8'],
  options: ['M9 6h11', 'M9 12h11', 'M9 18h11', 'M4 5h2v2H4z', 'M4 11h2v2H4z', 'M4 17h2v2H4z'],
  plus: ['M12 5v14', 'M5 12h14'],
  back: ['M15 5l-7 7 7 7'],
  up: ['M6 15l6-6 6 6'],
  down: ['M6 9l6 6 6-6'],
  remove: ['M6 6l12 12', 'M18 6L6 18'],
  archive: ['M3 4h18v4H3z', 'M5 8v12h14V8', 'M10 12h4'],
  site: ['M3 11l9-7 9 7', 'M5 9.5V20h14V9.5', 'M10 20v-6h4v6'],
  clock: ['M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18z', 'M12 7v5l3 3'],
  pause: ['M8 5v14', 'M16 5v14'],
  play: ['M7 4l13 8-13 8z'],
  stock: ['M4 7l8-4 8 4v10l-8 4-8-4z', 'M3 3l18 18'],
  store: [
    'M3 9l2-5h14l2 5',
    'M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z',
    'M5 13v7h14v-7',
  ],
  logout: ['M10 4H4v16h6', 'M15 8l4 4-4 4', 'M19 12H9'],
} satisfies Record<string, string[]>;

export type IconName = keyof typeof PATHS;

/** Pictogramme décoratif : le texte voisin (visible ou non) porte le sens. */
@Component({
  selector: 'app-icon',
  host: { class: 'icon', 'aria-hidden': 'true' },
  template: `
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="square"
      focusable="false"
    >
      @for (d of paths(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  protected readonly paths = computed(() => PATHS[this.name()]);
}
