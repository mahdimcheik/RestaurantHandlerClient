// Contenu fixe du carrousel d'accueil. Couleur unique : celle de `.brand` (`--flavour-bg/ink`, `_tokens.scss`).

export interface HeroFlavour {
  /** Libellé sur deux lignes. */
  lines: readonly [string, string];
  /** Photo du plat vu de dessus, fond transparent, et ses dimensions réelles en pixels. */
  image: string;
  width: number;
  height: number;
}

export const HERO_FLAVOURS: readonly HeroFlavour[] = [
  {
    lines: ['Pizza', 'Margherita'],
    image: 'https://ik.imagekit.io/accompagnement/margaritta_lBqWg32C-.png',
    width: 525,
    height: 526,
  },
  {
    lines: ['Desserts', 'Café'],
    image:
      'https://ik.imagekit.io/accompagnement/iffany-ai-generated-8673818_640-removebg-preview.png',
    width: 640,
    height: 640,
  },
  {
    lines: ['Salade', 'Composée'],
    image:
      'https://ik.imagekit.io/accompagnement/pexels-roman-odintsov-4958946_1_-removebg-preview.png',
    width: 550,
    height: 541,
  },
  {
    lines: ['Kebab', 'Maison'],
    image: 'https://ik.imagekit.io/accompagnement/kebab.png',
    width: 602,
    height: 541,
  },
];

export const RING_IMAGE = '/images/home/ring.webp';
export const PROPS_IMAGE = '/images/home/props.webp';
