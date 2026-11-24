// Contenu fixe du carrousel d'accueil. Les couleurs sont dans `_tokens.scss` (`--flavour-N-bg`,
// `--flavour-N-ink`, N de 1 à 5, dans l'ordre de ce tableau).

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
    lines: [$localize`:@@home.hero.dish1a:Pizza`, $localize`:@@home.hero.dish1b:Margherita`],
    image: 'https://ik.imagekit.io/accompagnement/margaritta.png',
    width: 525,
    height: 526,
  },
  {
    lines: [$localize`:@@home.hero.dish2a:Tiramisu`, $localize`:@@home.hero.dish2b:Café`],
    image: 'https://ik.imagekit.io/accompagnement/tiramisu.png',
    width: 640,
    height: 640,
  },
  {
    lines: [$localize`:@@home.hero.dish3a:Salade`, $localize`:@@home.hero.dish3b:Composée`],
    image: 'https://ik.imagekit.io/accompagnement/salade.png',
    width: 550,
    height: 541,
  },
  {
    lines: [$localize`:@@home.hero.dish4a:Kebab`, $localize`:@@home.hero.dish4b:Maison`],
    image: 'https://ik.imagekit.io/accompagnement/kebab.png',
    width: 602,
    height: 541,
  },
  {
    lines: [$localize`:@@home.hero.dish5a:Pâtes`, $localize`:@@home.hero.dish5b:Fraîches`],
    image: 'https://ik.imagekit.io/accompagnement/pasta.png',
    width: 515,
    height: 518,
  },
];

export const RING_IMAGE = '/images/home/ring.webp';
export const PROPS_IMAGE = '/images/home/props.webp';
