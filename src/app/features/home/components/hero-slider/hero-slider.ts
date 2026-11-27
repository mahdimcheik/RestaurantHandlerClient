import { NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  Component,
  ViewEncapsulation,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../../core/auth/session.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import {
  arrival,
  arrivalOffset,
  cover,
  departureOffset,
  dishBox,
  FRAME_WIDTH,
  LAYER_FACTORS,
  LayerName,
  LAYERS,
  sceneScale,
  SWEEP_MS,
  sweepClip,
  TRANSITION_END,
  wordSize,
  wordTarget,
  wordTop,
} from '../../hero-slider-geometry';
import {
  DESKTOP_PIECES,
  HERO_SLIDES,
  HeroSlide,
  MOBILE_PIECES,
  PiecePlacement,
} from '../../hero-slides';

/** Défilement automatique, et pause après une action de la personne, en millisecondes. */
const AUTOPLAY_MS = 2600;
const IDLE_MS = 6000;
/** Distance minimale d'un glissement horizontal, en pixels. */
const SWIPE_MIN = 45;
/** Ouverture : durée des calques, montée des commandes, filet de sécurité. */
const INTRO_MS = 900;
const RISE_MS = 1000;
const INTRO_FAILSAFE_MS = 3000;
const INTRO_EASING = 'cubic-bezier(0.22, 0.8, 0.3, 1)';
/** Largeur d'encre à 100 px par lettre, avant la mesure réelle (Poppins 700). */
const INK_PER_LETTER_GUESS = 62;

type Direction = 1 | -1;

interface Transition {
  from: number;
  to: number;
  dir: Direction;
  /** Temps écoulé, en durées de balayage. */
  t: number;
}

/**
 * Bloc d'accueil « diapositives » : une couleur pleine par plat, un mot géant derrière la photo,
 * changement par balayage avec parallaxe, onglets, flèches, glissement et défilement automatique
 * (avec pause, WCAG 2.2.2). La barre du haut est projetée par-dessus et prend l'encre du plat.
 */
@Component({
  selector: 'app-hero-slider',
  imports: [NgOptimizedImage, RouterLink, Icon],
  templateUrl: './hero-slider.html',
  styleUrl: './hero-slider.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    '(document:pointerup)': 'onPointerUp($event)',
    '(document:visibilitychange)': 'onVisibilityChange()',
  },
})
export class HeroSlider {
  readonly title = input.required<string>();

  protected readonly session = inject(SessionService);
  private readonly section = viewChild.required<ElementRef<HTMLElement>>('section');
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tab');

  protected readonly data = HERO_SLIDES;
  /** Balancement de chaque morceau, tiré une fois pour ne pas repartir à chaque image. */
  private readonly bobs = this.data.map(() => DESKTOP_PIECES.map(() => randomBob()));

  private readonly size = signal({ width: 1440, height: 900 });
  protected readonly reducedMotion = signal(prefersReducedMotion());
  protected readonly current = signal(0);
  private readonly transition = signal<Transition | null>(null);
  /** Lecture automatique : la personne peut l'arrêter (bouton Pause). */
  protected readonly playing = signal(true);
  /** Avant l'ouverture : contenu masqué le temps que la police arrive. */
  protected readonly intro = signal(!this.reducedMotion());
  protected readonly underline = signal({ x: 0, width: 0 });
  /** Largeur d'encre de chaque mot à 100 px, mesurée une fois la police chargée. */
  private readonly inkWidths = signal(this.data.map((s) => s.word.length * INK_PER_LETTER_GUESS));

  protected readonly scale = computed(() => sceneScale(this.size().width, this.size().height));
  /** Plat mis en avant : la cible dès le début d'une transition. */
  protected readonly active = computed(() => this.transition()?.to ?? this.current());
  protected readonly activeTone = computed(() => this.data[this.active()].tone);

  protected readonly slides = computed(() => {
    const transition = this.transition();
    const current = this.current();
    const target = wordTarget(this.scale(), this.size().width);
    const inks = this.inkWidths();

    return this.data.map((slide, i) => {
      const word = wordSize(inks[i], slide.word.length, target);
      const mobile = this.scale().mobile;
      const [dishX, dishY, dishWidth, dishHeight] = dishBox(
        slide,
        slide.dish.height / slide.dish.width,
        mobile,
      );
      let visible = i === current;
      let z = 2;
      let clip: string | null = null;
      let offsets: Record<LayerName, number> = { word: 0, shadow: 0, dish: 0, fruit: 0, corner: 0 };

      if (transition) {
        const c = cover(transition.t);
        if (i === transition.from) {
          visible = true;
          clip = sweepClip(c, transition.dir);
          const shift = departureOffset(c, transition.dir);
          offsets = { word: shift, shadow: shift, dish: shift, fruit: shift, corner: shift };
        } else if (i === transition.to) {
          visible = true;
          z = 1;
          const k = arrival(transition.t);
          offsets = Object.fromEntries(
            LAYERS.map((layer) => [layer, arrivalOffset(k, transition.dir, layer)]),
          ) as Record<LayerName, number>;
        } else {
          visible = false;
        }
      }

      return {
        slide,
        visible,
        z,
        clip,
        translate: Object.fromEntries(
          LAYERS.map((layer) => [layer, frameShift(offsets[layer])]),
        ) as Record<LayerName, string | null>,
        word: { size: word.size, spacing: `${word.spacing}em`, top: wordTop(word.size, mobile) },
        dish: { x: dishX, y: dishY, width: dishWidth, height: dishHeight },
        shadow: {
          x: dishX + dishWidth * 0.15,
          y: dishY + dishHeight * 0.9,
          width: dishWidth * 0.7,
          height: 34,
        },
        ...this.pieceViews(slide, i, mobile),
      };
    });
  });

  private lastInteraction = -Infinity;
  private inView = true;
  private pointerStart: { x: number; y: number } | null = null;
  private frameId = 0;
  private transitionStart = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      this.observeSize(destroyRef);
      this.observeVisibility(destroyRef);
      this.watchReducedMotion(destroyRef);
      this.startIntro(destroyRef);
      const timer = setInterval(() => this.autoplay(), AUTOPLAY_MS);
      destroyRef.onDestroy(() => clearInterval(timer));
    });

    afterRenderEffect(() => {
      this.size();
      this.inkWidths();
      const button = this.tabButtons()[this.active()]?.nativeElement;
      if (button) {
        const next = { x: button.offsetLeft, width: button.offsetWidth };
        const prev = this.underline();
        if (next.x !== prev.x || next.width !== prev.width) {
          this.underline.set(next);
        }
      }
    });

    destroyRef.onDestroy(() => cancelAnimationFrame(this.frameId));
  }

  protected next(): void {
    this.touch();
    this.go((this.current() + 1) % this.data.length, 1);
  }

  protected previous(): void {
    this.touch();
    this.go((this.current() - 1 + this.data.length) % this.data.length, -1);
  }

  protected select(index: number): void {
    this.touch();
    if (index !== this.current()) {
      this.go(index, index > this.current() ? 1 : -1);
    }
  }

  protected togglePlaying(): void {
    this.playing.update((playing) => !playing);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if ((event.target as Element | null)?.closest?.('.topbar')) {
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    this.pointerStart = { x: event.clientX, y: event.clientY };
  }

  protected onPointerUp(event: PointerEvent): void {
    const start = this.pointerStart;
    this.pointerStart = null;
    if (!start) {
      return;
    }
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        this.next();
      } else {
        this.previous();
      }
    }
  }

  protected onVisibilityChange(): void {
    if (document.hidden) {
      this.lastInteraction = performance.now();
    }
  }

  /** Change de plat ; ignoré pendant une transition. */
  private go(to: number, dir: Direction): void {
    if (this.transition() || to === this.current()) {
      return;
    }
    if (this.reducedMotion()) {
      this.current.set(to);
      return;
    }
    this.transitionStart = performance.now();
    this.transition.set({ from: this.current(), to, dir, t: 0 });
    this.frameId = requestAnimationFrame((now) => this.frame(now));
  }

  private frame(now: number): void {
    const transition = this.transition();
    if (!transition) {
      return;
    }
    const t = (now - this.transitionStart) / SWEEP_MS;
    if (t >= TRANSITION_END) {
      this.current.set(transition.to);
      this.transition.set(null);
      return;
    }
    this.transition.set({ ...transition, t });
    this.frameId = requestAnimationFrame((next) => this.frame(next));
  }

  private autoplay(): void {
    const idle = performance.now() - this.lastInteraction > IDLE_MS;
    if (this.playing() && idle && this.inView && !document.hidden) {
      this.go((this.current() + 1) % this.data.length, 1);
    }
  }

  private touch(): void {
    this.lastInteraction = performance.now();
  }

  /** Morceaux flottants du plat, répartis entre le calque net et le calque flou des coins. */
  private pieceViews(slide: HeroSlide, index: number, mobile: boolean) {
    const ingredients = slide.ingredients;
    const placements = ingredients ? (mobile ? MOBILE_PIECES : DESKTOP_PIECES) : [];
    const views = placements.map((p: PiecePlacement, j) => ({
      layer: p.layer,
      x: p.x,
      y: p.y,
      size: p.size,
      mirror: p.mirror,
      rotate: `${p.rotate}deg`,
      image: `url("${ingredients![p.ingredient]}")`,
      ...this.bobs[index][j],
    }));
    return {
      fruit: views.filter((v) => v.layer === 'fruit'),
      corner: views.filter((v) => v.layer === 'corner'),
    };
  }

  /** Après le chargement de la police : mesure des mots, puis entrée des calques et des commandes. */
  private startIntro(destroyRef: DestroyRef): void {
    let done = false;
    const run = () => {
      if (done) {
        return;
      }
      done = true;
      this.measureWords();
      if (this.intro()) {
        this.animateIntro();
        this.intro.set(false);
      }
    };
    const failsafe = setTimeout(run, INTRO_FAILSAFE_MS);
    destroyRef.onDestroy(() => clearTimeout(failsafe));
    if (document.fonts) {
      document.fonts.ready.then(run);
    } else {
      run();
    }
  }

  private animateIntro(): void {
    const root = this.section().nativeElement;
    if (typeof root.animate !== 'function') {
      return;
    }
    const frameWidth = FRAME_WIDTH * this.scale().u;
    const first = root.querySelectorAll<HTMLElement>('.brand-slider__slide')[0];
    first?.querySelectorAll<HTMLElement>('[data-layer]').forEach((layer) => {
      const factor = LAYER_FACTORS[layer.dataset['layer'] as LayerName] ?? 0;
      layer.animate(
        [{ transform: `translateX(${factor * frameWidth}px)` }, { transform: 'translateX(0)' }],
        { duration: INTRO_MS, easing: INTRO_EASING },
      );
    });
    root.querySelectorAll<HTMLElement>('[data-rise]').forEach((el) => {
      el.animate(
        [
          { opacity: 0, translate: '0 14px' },
          { opacity: 1, translate: '0 0' },
        ],
        {
          delay: Number(el.dataset['rise']),
          duration: RISE_MS,
          easing: INTRO_EASING,
          fill: 'backwards',
        },
      );
    });
  }

  /** Largeur d'encre de chaque mot en Poppins 700 à 100 px. */
  private measureWords(): void {
    if (!document.fonts) {
      return;
    }
    const context = document.createElement('canvas').getContext('2d');
    if (!context) {
      return;
    }
    const family = getComputedStyle(this.section().nativeElement)
      .getPropertyValue('--font-slider')
      .trim();
    context.font = `700 100px ${family || 'Poppins, sans-serif'}`;
    this.inkWidths.set(
      this.data.map((slide) => {
        const metrics = context.measureText(slide.word);
        return metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
      }),
    );
  }

  private observeSize(destroyRef: DestroyRef): void {
    const el = this.stage().nativeElement;
    const update = (width: number, height: number) => {
      if (width > 0 && height > 0) {
        this.size.set({ width, height });
      }
    };
    update(el.clientWidth, el.clientHeight);
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(([entry]) =>
      update(entry.contentRect.width, entry.contentRect.height),
    );
    observer.observe(el);
    destroyRef.onDestroy(() => observer.disconnect());
  }

  /** Pas de défilement automatique quand le bloc est hors de l'écran. */
  private observeVisibility(destroyRef: DestroyRef): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => (this.inView = entry.isIntersecting));
    observer.observe(this.section().nativeElement);
    destroyRef.onDestroy(() => observer.disconnect());
  }

  private watchReducedMotion(destroyRef: DestroyRef): void {
    const query = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) {
      return;
    }
    const onChange = (event: MediaQueryListEvent) => this.reducedMotion.set(event.matches);
    query.addEventListener('change', onChange);
    destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
  }
}

/** Durée de 3,2 à 5 s et départ décalé de 0 à 4 s, pour que deux morceaux ne bougent pas ensemble. */
function randomBob() {
  return {
    duration: `${(3.2 + Math.random() * 1.8).toFixed(2)}s`,
    delay: `${(-Math.random() * 4).toFixed(2)}s`,
  };
}

/** Décalage en part de la largeur du cadre → valeur de `translate`. */
function frameShift(fraction: number): string | null {
  return fraction === 0 ? null : `calc(${+fraction.toFixed(5)} * ${FRAME_WIDTH} * var(--su))`;
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
