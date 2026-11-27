import {
  arrival,
  arrivalOffset,
  COVER_TABLE,
  cover,
  departureOffset,
  dishBox,
  sceneScale,
  sweepClip,
  wordSize,
  wordTarget,
  wordTop,
} from './hero-slider-geometry';

describe('cover', () => {
  it('passe par chaque point mesuré', () => {
    for (const [t, c] of COVER_TABLE) {
      expect(cover(t)).toBeCloseTo(c, 6);
    }
  });

  it('ne recule jamais', () => {
    let previous = 0;
    for (let t = 0; t <= 1; t += 0.005) {
      const c = cover(t);
      expect(c).toBeGreaterThanOrEqual(previous);
      previous = c;
    }
  });

  it('couvre lentement le premier quart puis accélère', () => {
    expect(cover(0.5)).toBeLessThan(0.25);
    expect(cover(0.62)).toBeGreaterThan(0.8);
  });
});

describe('parallaxe', () => {
  it('fait partir le contenu sortant du côté opposé au sens', () => {
    expect(departureOffset(1, 1)).toBeCloseTo(-0.14);
    expect(departureOffset(1, -1)).toBeCloseTo(0.14);
  });

  it('commence l’arrivée à mi-balayage et la termine avant la fin', () => {
    expect(arrival(0.5)).toBe(0);
    expect(arrival(0.92)).toBe(1);
    expect(arrivalOffset(0, 1, 'fruit')).toBeCloseTo(0.55);
    expect(arrivalOffset(0, 1, 'word')).toBeCloseTo(0.4);
    expect(arrivalOffset(1, -1, 'corner')).toBeCloseTo(0);
  });

  it('découpe la diapositive sortante depuis le bord avant', () => {
    expect(sweepClip(0.25, 1)).toBe('inset(0 25% 0 0)');
    expect(sweepClip(0.25, -1)).toBe('inset(0 0 0 25%)');
  });
});

describe('sceneScale', () => {
  it('ajuste le cadre 1440 × 900 en bureau', () => {
    expect(sceneScale(1440, 900)).toEqual({ mobile: false, u: 1, offsetY: 0 });
    expect(sceneScale(844, 390).mobile).toBe(false);
    expect(sceneScale(844, 390).u).toBeCloseTo(390 / 900);
  });

  it('montre le centre du cadre sur téléphone et en portrait', () => {
    const phone = sceneScale(390, 844);
    expect(phone.mobile).toBe(true);
    expect(phone.u).toBeCloseTo(390 / 640);
    expect(phone.offsetY).toBe(8);
    expect(sceneScale(1024, 1366).mobile).toBe(true);
  });
});

describe('mot géant', () => {
  it('garde 445 px pour un mot court', () => {
    expect(wordSize(250, 5, 1400)).toEqual({ size: 445, spacing: 0.005 });
  });

  it('resserre et réduit un mot long pour remplir la largeur visée', () => {
    const word = wordSize(520, 10, 1400);
    expect(word.spacing).toBe(-0.035);
    expect(word.size).toBeLessThan(445);
    expect(word.size * (5.2 - 0.035 * 9)).toBeCloseTo(1400);
  });

  it('vise 92 % de la largeur visible sur téléphone', () => {
    const scale = sceneScale(390, 844);
    expect(wordTarget(scale, 390)).toBeCloseTo(640 * 0.92);
    expect(wordTarget(sceneScale(1440, 900), 1440)).toBe(1400);
  });

  it('garde la ligne médiane des capitales à 403,5', () => {
    for (const size of [445, 372, 257]) {
      expect(wordTop(size) + 0.85 * size - (0.698 * size) / 2).toBeCloseTo(403.5);
    }
    expect(Math.round(wordTop(445))).toBe(181);
  });
});

describe('dishBox', () => {
  it('garde la place du plat en bureau', () => {
    expect(dishBox({ x: 470, y: 180, width: 500 }, 1, false)).toEqual([470, 180, 500, 500]);
  });

  it('réduit et descend le plat sur téléphone, sous le mot remonté', () => {
    const [x, y, width] = dishBox({ x: 470, y: 180, width: 500 }, 1, true);
    expect(width).toBeLessThan(500);
    expect(x + width / 2).toBe(720);
    expect(wordTop(250, true)).toBeLessThan(wordTop(250));
    expect(y).toBeGreaterThan(wordTop(250, true) + 0.85 * 250 - 0.698 * 250);
  });
});
