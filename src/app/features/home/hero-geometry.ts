// Géométrie du carrousel d'accueil : calculs purs, en unités de scène (`u` = 1 px de la maquette
// 1440 × 900 en paysage, 390 × 760 en portrait), convertis en pixels à l'affichage.

/** Nombre de coupes sur l'anneau. */
export const COUPE_COUNT = 5;
/** Angle entre deux coupes. */
const STEP_DEG = 360 / COUPE_COUNT;

/** Part du cadre de l'image occupée par la coupe. */
const COUPE_FILL = 0.985;
/** Rayon de l'anneau dans l'image `ring` (1024 × 1024) : extérieur, intérieur, centre. */
const RING_OUTER = 462.5;
const RING_INNER = 354;
const RING_CENTER = { x: 507.5, y: 502.5 };
const RING_IMAGE = 1024;
/** Rayon du cercle des coupes rapporté au rayon extérieur : milieu de la bande de l'anneau. */
const BAND = (RING_OUTER + RING_INNER) / 2 / RING_OUTER;

/** Planche `props` (1024 × 688) : zones découpées [x, y, largeur, hauteur]. */
const PROPS_SHEET = { width: 1024, height: 688 };
export type PropKey = 'cone' | 'rasp' | 'blue' | 'spoonL' | 'spoonR';
const PROP_BOXES: Record<PropKey, readonly [number, number, number, number]> = {
  cone: [100, 63, 249, 276],
  rasp: [405, 214, 137, 132],
  blue: [691, 130, 186, 160],
  spoonL: [127, 381, 234, 211],
  spoonR: [658, 380, 233, 218],
};
export const PROP_KEYS = Object.keys(PROP_BOXES) as PropKey[];

/** Position d'un élément de texte : `left` / `top` en unités, centré horizontalement ou non. */
export interface TextSlot {
  left: number;
  top: number;
  centered: boolean;
}

/** Accessoire placé : taille, découpe dans la planche et transformation, en unités. */
export interface PropPlacement {
  key: PropKey;
  width: number;
  height: number;
  backgroundSize: [number, number];
  backgroundPosition: [number, number];
  x: number;
  y: number;
  rotate: number;
}

export interface HeroLayout {
  portrait: boolean;
  /** Taille d'une unité, en pixels. */
  u: number;
  stageWidth: number;
  stageHeight: number;
  /** Rayon du cercle des coupes. */
  radius: number;
  /** Diamètre de la coupe de devant et des coupes voisines. */
  big: number;
  small: number;
  /** Centre de l'anneau. */
  cx: number;
  cy: number;
  /** Diamètre de l'anneau. */
  ringDiameter: number;
  /** Rayons intérieur et extérieur de la bande de l'anneau. */
  ringInner: number;
  ringOuter: number;
  /** Image de l'anneau : taille et position du fond, pour aligner son centre sur celui du bloc. */
  ringBackgroundSize: number;
  ringBackgroundPosition: [number, number];
  /** Côté de l'image d'une coupe et de son ombre. */
  coupeSize: number;
  shadowSize: number;
  eyebrow: TextSlot;
  flavour: TextSlot;
  cta: TextSlot;
  title: TextSlot;
  /** Largeur visée pour le titre. */
  titleWidth: number;
  props: PropPlacement[];
}

/** Calcule la mise en page pour un bloc de `width` × `height` pixels. */
export function heroLayout(width: number, height: number): HeroLayout {
  const portrait = width / height < 0.9;
  return portrait ? portraitLayout(width, height) : landscapeLayout(width, height);
}

function landscapeLayout(width: number, height: number): HeroLayout {
  const u =
    height < 560 ? Math.min(width / 1440, height / 770) : Math.min(width / 1440, height / 900);
  const radius = 430;
  const big = 470;
  const bowlY = 418;
  return {
    ...ring(radius, 1440 / 2, bowlY - radius),
    portrait: false,
    u,
    stageWidth: 1440,
    stageHeight: 900,
    big,
    small: 292,
    ...coupeSizes(big),
    eyebrow: { left: 158, top: 455, centered: false },
    flavour: { left: 190, top: 497, centered: false },
    cta: { left: 190, top: 572, centered: false },
    title: { left: 190, top: 632, centered: false },
    titleWidth: 1062,
    props: placeProps({
      cone: [-34, 168, 190, -14],
      rasp: [34, 340, 118, 0],
      blue: [1238, 360, 168, 0],
      spoonL: [86, 760, 210, 0],
      spoonR: [1146, 760, 210, 0],
    }),
  };
}

function portraitLayout(width: number, height: number): HeroLayout {
  const u = Math.min(width / 390, height / 760);
  const stageHeight = height / u;
  const radius = 222;
  const big = 262;
  const stack = big + 22 + 138 + 20 + 50;
  const top = 82;
  const available = stageHeight - 70 - top;
  const bowlY = top + Math.max(0, (available - stack) * 0.45) + big / 2;
  const copyTop = bowlY + big / 2 + 22;
  const titleTop = copyTop + 158;
  const spoonsTop = Math.max(titleTop, stageHeight - 170) + 62;
  return {
    ...ring(radius, 390 / 2, bowlY - radius),
    portrait: true,
    u,
    stageWidth: 390,
    stageHeight,
    big,
    small: 158,
    ...coupeSizes(big),
    eyebrow: { left: 0, top: copyTop, centered: true },
    flavour: { left: 0, top: copyTop + 30, centered: true },
    cta: { left: 0, top: copyTop + 92, centered: true },
    title: { left: 0, top: titleTop, centered: true },
    titleWidth: 350,
    props: placeProps({
      cone: [-50, bowlY + 150, 104, -14],
      rasp: [-26, bowlY + 250, 70, 0],
      blue: [312, bowlY + 170, 96, 0],
      spoonL: [-44, spoonsTop, 150, 0],
      spoonR: [284, spoonsTop, 150, 0],
    }),
  };
}

function ring(radius: number, cx: number, cy: number) {
  const ringDiameter = (2 * radius) / BAND;
  const k = ringDiameter / (2 * RING_OUTER);
  return {
    radius,
    cx,
    cy,
    ringDiameter,
    ringOuter: ringDiameter / 2,
    ringInner: (ringDiameter / 2) * (RING_INNER / RING_OUTER),
    ringBackgroundSize: RING_IMAGE * k,
    ringBackgroundPosition: [
      ringDiameter / 2 - RING_CENTER.x * k,
      ringDiameter / 2 - RING_CENTER.y * k,
    ] as [number, number],
  };
}

function coupeSizes(big: number) {
  return { coupeSize: big / COUPE_FILL, shadowSize: 1.12 * big };
}

function placeProps(
  config: Record<PropKey, readonly [number, number, number, number]>,
): PropPlacement[] {
  return PROP_KEYS.map((key) => {
    const [x, y, width, rotate] = config[key];
    const [bx, by, bw, bh] = PROP_BOXES[key];
    const s = width / bw;
    return {
      key,
      width,
      height: bh * s,
      backgroundSize: [PROPS_SHEET.width * s, PROPS_SHEET.height * s],
      backgroundPosition: [-bx * s, -by * s],
      x,
      y,
      rotate,
    };
  });
}

/** Position d'une coupe sur l'anneau, pour une position de carrousel `p` (0 à 5, fractionnaire). */
export interface CoupeFrame {
  /** Coin haut-gauche de l'image, en unités. */
  x: number;
  y: number;
  /** Coin haut-gauche de l'ombre, en unités. */
  shadowX: number;
  shadowY: number;
  scale: number;
  rotate: number;
  zIndex: number;
}

/** Écart signé entre la coupe `i` et la position `p`, ramené dans [-2,5 ; 2,5[. */
function offset(i: number, p: number): number {
  const diff = (((i - p) % COUPE_COUNT) + COUPE_COUNT) % COUPE_COUNT;
  return diff >= COUPE_COUNT / 2 ? diff - COUPE_COUNT : diff;
}

export function coupeFrame(i: number, p: number, layout: HeroLayout): CoupeFrame {
  const diff = offset(i, p);
  const angle = ((90 - diff * STEP_DEG) * Math.PI) / 180;
  const x = layout.cx + layout.radius * Math.cos(angle);
  const y = layout.cy + layout.radius * Math.sin(angle);
  const distance = Math.abs(diff);
  const ratio = layout.small / layout.big;
  const scale = distance <= 1 ? 1 + (ratio - 1) * distance : ratio - (distance - 1) * 0.08;
  return {
    x: x - layout.coupeSize / 2,
    y: y - layout.coupeSize / 2,
    shadowX: x - layout.shadowSize / 2,
    shadowY: y + 0.05 * layout.big * scale - layout.shadowSize / 2,
    scale,
    rotate: (p - i) * STEP_DEG,
    zIndex: 4 + Math.round(100 - distance * 20),
  };
}

/** Rotation de l'anneau pour la position `p`. */
export function ringRotation(p: number): number {
  return p * STEP_DEG;
}

/** Courbe `cubic-bezier(0.42, 0, 0.58, 1)` (ease-in-out), résolue par Newton. */
export function easeInOut(t: number): number {
  const x1 = 0.42;
  const x2 = 0.58;
  let u = t;
  for (let i = 0; i < 5; i++) {
    const x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
    const dx = 3 * (1 - u) * (1 - u) * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2);
    if (Math.abs(dx) < 1e-6) {
      break;
    }
    u = Math.max(0, Math.min(1, u - (x - t) / dx));
  }
  return 3 * (1 - u) * u * u + u * u * u;
}

/** Parfum affiché pour la position `p` : couleurs à mélanger et libellé en fondu. */
export interface FlavourFrame {
  /** Parfum courant et suivant (indices 0 à 4). */
  current: number;
  next: number;
  /** Avancement de la transition, 0 à 1. */
  t: number;
  /** Parfum dont le libellé est affiché. */
  shown: number;
  /** Opacité du libellé et décalage vertical, en unités. */
  opacity: number;
  shift: number;
}

export function flavourAt(p: number): FlavourFrame {
  const current = ((Math.floor(p) % COUPE_COUNT) + COUPE_COUNT) % COUPE_COUNT;
  const next = (current + 1) % COUPE_COUNT;
  const t = p - Math.floor(p);
  return t < 0.5
    ? { current, next, t, shown: current, opacity: 1 - 2 * t, shift: -16 * t }
    : { current, next, t, shown: next, opacity: 2 * t - 1, shift: 16 * (1 - t) };
}
