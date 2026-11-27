import { COUPE_COUNT, coupeFrame, easeInOut, flavourAt, heroLayout } from './hero-geometry';

describe('heroLayout', () => {
  it('passe en portrait sous un rapport largeur / hauteur de 0,9', () => {
    expect(heroLayout(1440, 900).portrait).toBe(false);
    expect(heroLayout(390, 844).portrait).toBe(true);
  });

  it('met la scène paysage à l’échelle de la place disponible', () => {
    expect(heroLayout(1440, 900).u).toBe(1);
    expect(heroLayout(720, 450).u).toBe(0.5);
  });
});

describe('coupeFrame', () => {
  const layout = heroLayout(1440, 900);
  const center = (i: number, p: number) => {
    const frame = coupeFrame(i, p, layout);
    return { x: frame.x + layout.coupeSize / 2, y: frame.y + layout.coupeSize / 2, frame };
  };

  it('place la coupe courante en bas de l’anneau, en grand et au premier plan', () => {
    const { x, y, frame } = center(0, 0);
    expect(x).toBeCloseTo(layout.cx);
    expect(y).toBeCloseTo(layout.cy + layout.radius);
    expect(frame.scale).toBe(1);
    expect(frame.zIndex).toBeGreaterThan(coupeFrame(1, 0, layout).zIndex);
  });

  it('réduit les coupes voisines au rapport petit / grand, puis les suivantes', () => {
    expect(coupeFrame(1, 0, layout).scale).toBeCloseTo(layout.small / layout.big);
    expect(coupeFrame(COUPE_COUNT - 1, 0, layout).scale).toBeCloseTo(layout.small / layout.big);
    expect(coupeFrame(2, 0, layout).scale).toBeLessThan(layout.small / layout.big);
  });

  it('amène la coupe suivante au premier plan après un cinquième de tour', () => {
    const { x, y } = center(1, 1);
    expect(x).toBeCloseTo(layout.cx);
    expect(y).toBeCloseTo(layout.cy + layout.radius);
  });
});

describe('easeInOut', () => {
  it('part de 0, finit à 1 et passe par le milieu à mi-course', () => {
    expect(easeInOut(0)).toBeCloseTo(0);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
    expect(easeInOut(1)).toBeCloseTo(1);
  });
});

describe('flavourAt', () => {
  it('garde le libellé courant jusqu’à mi-transition, puis montre le suivant', () => {
    expect(flavourAt(0)).toMatchObject({ current: 0, next: 1, shown: 0, opacity: 1 });
    expect(flavourAt(0.25)).toMatchObject({ shown: 0, opacity: 0.5 });
    expect(flavourAt(0.75)).toMatchObject({ shown: 1, opacity: 0.5 });
  });

  it('revient au premier parfum après le dernier', () => {
    expect(flavourAt(3.5)).toMatchObject({ current: 3, next: 0 });
  });
});
