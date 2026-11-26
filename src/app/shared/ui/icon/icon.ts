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
  minus: ['M5 12h14'],
  back: ['M15 5l-7 7 7 7'],
  forward: ['M9 5l7 7-7 7'],
  up: ['M6 15l6-6 6 6'],
  down: ['M6 9l6 6 6-6'],
  remove: ['M6 6l12 12', 'M18 6L6 18'],
  info: ['M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18z', 'M12 11v6', 'M12 7v1.5'],
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
  online: [
    'M2 9a15 15 0 0 1 20 0',
    'M5 12.5a10 10 0 0 1 14 0',
    'M8.5 16a5 5 0 0 1 7 0',
    'M12 20h.01',
  ],
  offline: [
    'M2 9a15 15 0 0 1 20 0',
    'M5 12.5a10 10 0 0 1 14 0',
    'M8.5 16a5 5 0 0 1 7 0',
    'M12 20h.01',
    'M3 3l18 18',
  ],
  orders: ['M6 3h12v18l-3-2-3 2-3-2-3 2z', 'M9 8h6', 'M9 12h6', 'M9 16h3'],
  bell: ['M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z', 'M10 21h4'],
  bellOff: ['M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z', 'M10 21h4', 'M3 3l18 18'],
  check: ['M5 12l5 5 9-10'],
  done: ['M2 12l5 5 10-10', 'M12 17l10-10'],
  alert: ['M12 3l10 18H2z', 'M12 10v5', 'M12 18h.01'],
  flame: ['M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3 0-5 1-8z'],
  noShow: [
    'M9 11a4 4 0 1 0 0-8 4 4 0 1 0 0 8z',
    'M2 21c0-4 3-7 7-7s7 3 7 7',
    'M17 8l5 5',
    'M22 8l-5 5',
  ],
  card: ['M3 6h18v12H3z', 'M3 10h18', 'M7 15h4'],
  bag: ['M5 8h14l-1 13H6z', 'M9 8V6a3 3 0 0 1 6 0v2'],
  chart: ['M4 20V4', 'M4 20h16', 'M8 16v-4', 'M12 16V8', 'M16 16v-6'],
  users: [
    'M9 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7z',
    'M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6',
    'M16 4.5a3.5 3.5 0 0 1 0 6.5',
    'M18 14.5c1.8.8 3 2.8 3 5.5',
  ],
  cash: ['M3 7h18v10H3z', 'M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  user: ['M12 4a4 4 0 1 0 0 8 4 4 0 1 0 0-8z', 'M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7'],
  sun: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8z',
    'M12 2v2',
    'M12 20v2',
    'M4.9 4.9l1.4 1.4',
    'M17.7 17.7l1.4 1.4',
    'M2 12h2',
    'M20 12h2',
    'M4.9 19.1l1.4-1.4',
    'M17.7 6.3l1.4-1.4',
  ],
  moon: ['M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z'],
  monitor: ['M3 4h18v12H3z', 'M8 20h8', 'M12 16v4'],
  cart: [
    'M3 4h2.2l2.1 10.2a1.6 1.6 0 0 0 1.6 1.3h7.9a1.6 1.6 0 0 0 1.6-1.2L20 8H6.2',
    'M9.5 18.2a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 1 0 0-2.6z',
    'M17 18.2a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 1 0 0-2.6z',
  ],
  phone: [
    'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  ],
  mail: ['M3 5h18v14H3z', 'M3 6l9 7 9-7'],
  pin: [
    'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z',
    'M12 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5z',
  ],
  camera: ['M4 4h16v16H4z', 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7z', 'M16.5 7h.01'],
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
