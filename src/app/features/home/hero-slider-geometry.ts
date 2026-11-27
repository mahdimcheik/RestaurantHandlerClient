// Géométrie du bloc d'accueil « diapositives » : calculs purs, en pixels de la maquette 1440 × 900
// (unité `su` côté styles), convertis à l'affichage par `--su`.

export const FRAME_WIDTH = 1440;
export const FRAME_HEIGHT = 900;

/** Durée du balayage qui recouvre la diapositive sortante, en millisecondes. */
export const SWEEP_MS = 970;

/** Recouvrement mesuré de la diapositive sortante : temps (0 à 1) → part couverte (0 à 1). */
export const COVER_TABLE: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.031, 0.006],
  [0.134, 0.012],
  [0.206, 0.023],
  [0.278, 0.047],
  [0.34, 0.07],
  [0.412, 0.105],
  [0.485, 0.158],
  [0.546, 0.246],
  [0.583, 0.55],
  [0.62, 0.825],
  [0.69, 0.9],
  [0.79, 0.94],
  [0.85, 0.956],
  [0.93, 0.975],
  [1, 1],
];

/** Calques d'une diapositive, du fond vers l'avant, et leur amplitude de parallaxe à l'arrivée. */
export const LAYERS = ['word', 'shadow', 'dish', 'fruit', 'corner'] as const;
export type LayerName = (typeof LAYERS)[number];
export const LAYER_FACTORS: Record<LayerName, number> = {
  word: 0.4,
  shadow: 0.3,
  dish: 0.15,
  fruit: 0.55,
  corner: 0.75,
};
/** Glissement de la diapositive sortante, en part de la largeur du cadre, une fois couverte. */
const DEPARTURE = 0.14;
/** L'arrivée commence à mi-balayage et dure 0,42 de sa durée. */
const ARRIVAL_START = 0.5;
const ARRIVAL_SPAN = 0.42;

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function smoothstep(k: number): number {
  return k * k * (3 - 2 * k);
}

/** Part couverte au temps `t`, lissée entre deux points du tableau. */
export function cover(t: number): number {
  const time = clamp01(t);
  for (let i = 1; i < COVER_TABLE.length; i++) {
    const [t1, c1] = COVER_TABLE[i];
    if (time <= t1) {
      const [t0, c0] = COVER_TABLE[i - 1];
      return c0 + (c1 - c0) * smoothstep((time - t0) / (t1 - t0));
    }
  }
  return 1;
}

export function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

/** Avancement de l'arrivée (0 à 1) au temps `t` du balayage, `t` pouvant dépasser 1. */
export function arrival(t: number): number {
  return easeOutQuad(clamp01((t - ARRIVAL_START) / ARRIVAL_SPAN));
}

/** Temps où la transition se termine : balayage fini et contenu arrivé. */
export const TRANSITION_END = Math.max(1, ARRIVAL_START + ARRIVAL_SPAN);

/** Décalage d'un calque sortant, en part de la largeur du cadre. */
export function departureOffset(c: number, dir: 1 | -1): number {
  return -dir * c * DEPARTURE;
}

/** Décalage d'un calque entrant, en part de la largeur du cadre. */
export function arrivalOffset(k: number, dir: 1 | -1, layer: LayerName): number {
  return dir * (1 - k) * LAYER_FACTORS[layer];
}

/** Découpe de la diapositive sortante : son bord avant recule vers le côté d'où l'on vient. */
export function sweepClip(c: number, dir: 1 | -1): string {
  const pct = `${+(c * 100).toFixed(3)}%`;
  return dir === 1 ? `inset(0 ${pct} 0 0)` : `inset(0 0 0 ${pct})`;
}

export interface SceneScale {
  mobile: boolean;
  /** Taille d'un pixel de maquette, en pixels. */
  u: number;
  /** Décalage vertical du cadre, en pixels. */
  offsetY: number;
}

/** Téléphone et tablette en portrait : on ne montre que le centre du cadre. */
export function isMobileViewport(width: number, height: number): boolean {
  return width <= 820 || height > width;
}

export function sceneScale(width: number, height: number): SceneScale {
  if (isMobileViewport(width, height)) {
    return {
      mobile: true,
      u: Math.max(0.1, Math.min(width / 640, (height - 200) / 620)),
      offsetY: 8,
    };
  }
  return { mobile: false, u: Math.min(width / FRAME_WIDTH, height / FRAME_HEIGHT), offsetY: 0 };
}

/** Taille et approche du mot géant. */
export interface WordSize {
  /** Taille de police, en pixels de maquette. */
  size: number;
  /** Espacement des lettres, en em. */
  spacing: number;
}

const WORD_MAX = 445;
const WORD_SPACING = 0.005;
const WORD_SPACING_TIGHT = -0.035;
/** Au-delà de 95 % de la largeur visée, le mot se resserre et se réduit pour la remplir. */
const WORD_TIGHTEN_AT = 0.95;
/** Hauteur des capitales de Poppins rapportée à la taille, et position de la ligne de base. */
const CAP_HEIGHT = 0.698;
const BASELINE = 0.85;
/** Ligne médiane des capitales dans le cadre. */
const CAP_CENTER = 403.5;

/**
 * Taille du mot : 445 px, sauf si son encre dépasse la largeur visée (1400 px en bureau, 92 % de la
 * largeur visible en mobile) ; il est alors resserré et réduit pour la remplir exactement.
 * `inkAt100` : largeur d'encre du mot à 100 px, sans espacement ; `letters` : nombre de lettres.
 */
export function wordSize(inkAt100: number, letters: number, target: number): WordSize {
  const ink = (size: number, spacing: number) =>
    size * (inkAt100 / 100 + spacing * Math.max(0, letters - 1));
  if (ink(WORD_MAX, WORD_SPACING) <= target * WORD_TIGHTEN_AT) {
    return { size: WORD_MAX, spacing: WORD_SPACING };
  }
  const perPixel = ink(1, WORD_SPACING_TIGHT);
  const size = perPixel > 0 ? Math.min(WORD_MAX, target / perPixel) : WORD_MAX;
  return { size, spacing: WORD_SPACING_TIGHT };
}

/** Largeur visée pour le mot, en pixels de maquette. */
export function wordTarget(scale: SceneScale, viewportWidth: number): number {
  if (!scale.mobile) {
    return 1400;
  }
  return Math.min(FRAME_WIDTH, viewportWidth / scale.u) * 0.92;
}

/**
 * Sur téléphone, un plat rond cacherait presque tout le mot : le mot monte et le plat, plus petit,
 * descend, pour que le mot reste lisible tout en passant derrière le haut du plat.
 */
const MOBILE_CAP_CENTER = 250;
const MOBILE_DISH_WIDTH = 420;
const MOBILE_DISH_CENTER_Y = 540;

/** Haut de la boîte du mot, pour garder la ligne médiane des capitales au même endroit. */
export function wordTop(size: number, mobile = false): number {
  const center = mobile ? MOBILE_CAP_CENTER : CAP_CENTER;
  return center + (CAP_HEIGHT * size) / 2 - BASELINE * size;
}

/** Boîte du plat [x, y, largeur, hauteur] ; `ratio` = hauteur / largeur de la photo. */
export function dishBox(
  desktop: { x: number; y: number; width: number },
  ratio: number,
  mobile: boolean,
): readonly [number, number, number, number] {
  if (!mobile) {
    return [desktop.x, desktop.y, desktop.width, desktop.width * ratio];
  }
  const width = MOBILE_DISH_WIDTH;
  const height = width * ratio;
  return [FRAME_WIDTH / 2 - width / 2, MOBILE_DISH_CENTER_Y - height / 2, width, height];
}
