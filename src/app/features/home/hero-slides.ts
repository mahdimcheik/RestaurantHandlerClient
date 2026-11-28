// Contenu du bloc d'accueil « diapositives » (`HOME_HERO = 'slider'`). Couleurs : jetons
// `--slide-<ton>-bg` / `--slide-<ton>-ink` de `_tokens.scss`.

import { HERO_FLAVOURS, HeroFlavour } from './hero-flavours';

export type SlideTone = 'pizza' | 'Desserts' | 'salade' | 'kebab';

/** Trois ingrédients détourés (PNG ou WebP à fond transparent, à peu près carrés) par plat. */
export type Ingredients = readonly [string, string, string];

/**
 * Ingrédients flottants de chaque plat ; `null` : pas de morceaux autour de ce plat.
 * Exemple : `pizza: ['/images/home/ingredients/basilic.webp', '/images/home/ingredients/tomate.webp',
 * '/images/home/ingredients/mozzarella.webp']` (fichiers dans `public/images/home/ingredients/`).
 */
const INGREDIENTS: Record<SlideTone, Ingredients | null> = {
  pizza: [
    'https://ik.imagekit.io/accompagnement/istockphoto-184920878-612x612-removebg-preview.png',
    'https://ik.imagekit.io/accompagnement/spr.png',
    'https://ik.imagekit.io/accompagnement/spv.png',
  ],
  Desserts: [
    'https://ik.imagekit.io/accompagnement/dsc2114-2-787x590-1-removebg-preview.png',
    'https://ik.imagekit.io/accompagnement/cacao-cru-bio-en-poudre-200g.png',
    'https://ik.imagekit.io/accompagnement/mascarpone-removebg-preview.png',
  ],
  salade: [
    'https://ik.imagekit.io/accompagnement/istockphoto-184920878-612x612-removebg-preview.png?updatedAt=1795794445988',
    'https://ik.imagekit.io/accompagnement/avocat_196052669.png?updatedAt=1795794445875',
    'https://ik.imagekit.io/accompagnement/pexels-fotios-photos-1433487-removebg-preview.png?updatedAt=1795794445900',
  ],
  kebab: [
    'https://ik.imagekit.io/accompagnement/tomate-cerise-grappe-extra5_m-removebg-preview.png?updatedAt=1795794445881',
    'https://ik.imagekit.io/accompagnement/e6521fa0-05b3-11ed-93ba-314ede9cd985.jpg-removebg-preview.png',
    'https://ik.imagekit.io/accompagnement/salade-laitue-removebg-preview.png',
  ],
};

/**
 * Place d'un morceau flottant, la même pour tous les plats : ingrédient (0 à 2), coin haut gauche
 * et côté de sa boîte carrée en pixels de maquette, rotation de base en degrés, miroir.
 * Calque `fruit` : net, devant le plat ; `corner` : grand et flou, dans un coin de l'écran.
 */
export interface PiecePlacement {
  ingredient: 0 | 1 | 2;
  x: number;
  y: number;
  size: number;
  rotate: number;
  mirror: boolean;
  layer: 'fruit' | 'corner';
}

/** Bureau : disposition de Blendy, écartée pour un plat rond plus large que la bouteille. */
export const DESKTOP_PIECES: readonly PiecePlacement[] = [
  { ingredient: 1, x: 340, y: 170, size: 110, rotate: 0, mirror: false, layer: 'fruit' },
  { ingredient: 2, x: 1010, y: 215, size: 125, rotate: 0, mirror: false, layer: 'fruit' },
  { ingredient: 0, x: 265, y: 470, size: 135, rotate: -8, mirror: false, layer: 'fruit' },
  { ingredient: 0, x: 1235, y: 450, size: 130, rotate: 15, mirror: true, layer: 'fruit' },
  { ingredient: 1, x: 1000, y: 590, size: 115, rotate: 30, mirror: false, layer: 'fruit' },
  { ingredient: 0, x: -15, y: 590, size: 255, rotate: 0, mirror: false, layer: 'corner' },
  { ingredient: 2, x: 1282, y: 40, size: 200, rotate: 0, mirror: false, layer: 'corner' },
];

/** Téléphone : seul le centre du cadre est visible ; quatre morceaux autour du plat descendu. */
export const MOBILE_PIECES: readonly PiecePlacement[] = [
  { ingredient: 1, x: 425, y: 335, size: 90, rotate: 0, mirror: false, layer: 'fruit' },
  { ingredient: 2, x: 915, y: 365, size: 100, rotate: 0, mirror: false, layer: 'fruit' },
  { ingredient: 0, x: 405, y: 620, size: 105, rotate: -8, mirror: false, layer: 'fruit' },
  { ingredient: 1, x: 905, y: 650, size: 95, rotate: 30, mirror: false, layer: 'fruit' },
];

export interface HeroSlide {
  dish: HeroFlavour;
  /** Mot géant derrière le plat, et libellé de l'onglet. */
  word: string;
  tone: SlideTone;
  /** Plat : bord gauche, haut et largeur, en pixels de maquette. */
  x: number;
  y: number;
  width: number;
  ingredients: Ingredients | null;
}

const DISH_WIDTH = 500;
/** Centre vertical du plat dans le cadre, un peu sous la ligne médiane du mot (403,5). */
const DISH_CENTER_Y = 430;
const TONES: readonly SlideTone[] = ['pizza', 'Desserts', 'salade', 'kebab'];

export const HERO_SLIDES: readonly HeroSlide[] = HERO_FLAVOURS.map((dish, i) => ({
  dish,
  word: dish.lines[0],
  tone: TONES[i],
  x: 720 - DISH_WIDTH / 2,
  y: DISH_CENTER_Y - (DISH_WIDTH * dish.height) / dish.width / 2,
  width: DISH_WIDTH,
  ingredients: INGREDIENTS[TONES[i]],
}));
