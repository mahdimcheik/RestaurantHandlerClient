import { NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../../core/auth/session.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { HERO_FLAVOURS, PROPS_IMAGE, RING_IMAGE } from '../../hero-flavours';
import {
  COUPE_COUNT,
  coupeFrame,
  easeInOut,
  flavourAt,
  heroLayout,
  ringRotation,
  TextSlot,
} from '../../hero-geometry';

/** Pause sur chaque parfum, puis durée du quart de tour, en millisecondes. */
const HOLD = 1400;
const TURN = 500;
/** Avec `prefers-reduced-motion` : changement instantané, plus espacé. */
const HOLD_REDUCED = 3000;
/** Au-delà de cet écart entre deux images (onglet masqué…), la minuterie est décalée. */
const MAX_GAP = 250;
/** Rapport largeur / taille de police du titre, avant la première mesure. */
const TITLE_RATIO_GUESS = 10.62;

/**
 * Bloc d'accueil : coupes en carrousel sur un anneau qui tourne, fond et encre de la surface,
 * titre géant (nom du restaurant) et accès à la carte. Le contenu projeté (barre du haut) est
 * superposé au bloc et en hérite les couleurs.
 */
@Component({
  selector: 'app-hero-carousel',
  imports: [NgOptimizedImage, RouterLink, Icon],
  templateUrl: './hero-carousel.html',
})
export class HeroCarousel {
  readonly title = input.required<string>();

  private readonly injector = inject(Injector);
  protected readonly session = inject(SessionService);
  private readonly section = viewChild.required<ElementRef<HTMLElement>>('section');
  private readonly titleEl = viewChild.required<ElementRef<HTMLElement>>('titleEl');

  protected readonly flavours = HERO_FLAVOURS;
  protected readonly ringImage = `url("${RING_IMAGE}")`;
  protected readonly propsImage = `url("${PROPS_IMAGE}")`;

  private readonly size = signal({ width: 1440, height: 900 });
  /** Position du carrousel : 0 à `COUPE_COUNT`, fractionnaire pendant un quart de tour. */
  private readonly position = signal(0);
  private readonly reducedMotion = signal(prefersReducedMotion());
  /** Largeur du titre divisée par sa taille de police. */
  private readonly titleRatio = signal(TITLE_RATIO_GUESS);

  /** L'animation tourne tant que la personne ne l'a pas arrêtée ; sans mouvement réduit au départ. */
  protected readonly playing = signal(!this.reducedMotion());

  protected readonly layout = computed(() => heroLayout(this.size().width, this.size().height));
  protected readonly u = computed(() => this.layout().u);

  protected readonly stage = computed(() => {
    const { stageWidth, stageHeight } = this.layout();
    return { width: stageWidth * this.u(), height: stageHeight * this.u() };
  });

  protected readonly ring = computed(() => {
    const l = this.layout();
    const u = this.u();
    const inner = l.ringInner * u;
    const outer = l.ringOuter * u;
    const left = (l.cx - l.ringDiameter / 2) * u;
    const top = (l.cy - l.ringDiameter / 2) * u;
    return {
      size: l.ringDiameter * u,
      backgroundSize: `${l.ringBackgroundSize * u}px`,
      backgroundPosition: `${l.ringBackgroundPosition[0] * u}px ${l.ringBackgroundPosition[1] * u}px`,
      mask:
        `radial-gradient(circle closest-side, transparent ${inner - 1}px, #000 ${inner + 0.5}px, ` +
        `#000 ${outer - 1.5}px, transparent ${outer}px)`,
      shadow:
        `radial-gradient(circle closest-side, transparent ${inner - 10 * u}px, ` +
        `var(--brand-shadow) ${inner + 6 * u}px, var(--brand-shadow) ${outer - 4 * u}px, ` +
        `transparent ${outer + 14 * u}px)`,
      shadowTransform: `translate(${left}px, ${top + 10 * u}px)`,
      left,
      top,
    };
  });

  protected readonly ringTransform = computed(() => {
    const ring = this.ring();
    return `translate(${ring.left}px, ${ring.top}px) rotate(${ringRotation(this.position())}deg)`;
  });

  protected readonly coupes = computed(() => {
    const l = this.layout();
    const u = this.u();
    const p = this.position();
    return this.flavours.map((flavour, i) => {
      const f = coupeFrame(i, p, l);
      return {
        image: flavour.image,
        width: flavour.width,
        height: flavour.height,
        zIndex: f.zIndex,
        transform: `translate(${f.x * u}px, ${f.y * u}px) scale(${f.scale}) rotate(${f.rotate}deg)`,
        shadowTransform: `translate(${f.shadowX * u}px, ${f.shadowY * u}px) scale(${f.scale})`,
      };
    });
  });

  protected readonly coupeSize = computed(() => this.layout().coupeSize * this.u());
  protected readonly shadowSize = computed(() => this.layout().shadowSize * this.u());

  protected readonly props = computed(() => {
    const u = this.u();
    return this.layout().props.map((prop) => ({
      key: prop.key,
      width: prop.width * u,
      height: prop.height * u,
      backgroundSize: `${prop.backgroundSize[0] * u}px ${prop.backgroundSize[1] * u}px`,
      backgroundPosition: `${prop.backgroundPosition[0] * u}px ${prop.backgroundPosition[1] * u}px`,
      transform: `translate(${prop.x * u}px, ${prop.y * u}px) rotate(${prop.rotate}deg)`,
    }));
  });

  private readonly flavourFrame = computed(() => flavourAt(this.position()));

  protected readonly flavour = computed(() => {
    const frame = this.flavourFrame();
    return {
      lines: this.flavours[frame.shown].lines,
      opacity: frame.opacity,
      transform: `translateY(${frame.shift * this.u()}px)`,
    };
  });

  protected readonly eyebrowSlot = computed(() => this.slot(this.layout().eyebrow));
  protected readonly flavourSlot = computed(() => this.slot(this.layout().flavour));
  protected readonly ctaSlot = computed(() => this.slot(this.layout().cta));
  protected readonly titleSlot = computed(() => this.slot(this.layout().title));
  protected readonly titleSize = computed(
    () => (this.layout().titleWidth * this.u()) / this.titleRatio(),
  );

  private step = 0;
  private phaseStart = 0;
  private lastTime = 0;
  private frameId = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      this.observeSize(destroyRef);
      this.watchReducedMotion(destroyRef);
      document.fonts?.ready.then(() => this.measureTitle());
      if (this.playing()) {
        this.start();
      }
    });

    effect(() => {
      this.title();
      afterNextRender(() => this.measureTitle(), { injector: this.injector });
    });

    destroyRef.onDestroy(() => cancelAnimationFrame(this.frameId));
  }

  protected togglePlaying(): void {
    if (this.playing()) {
      this.playing.set(false);
      cancelAnimationFrame(this.frameId);
      this.position.set(this.step);
    } else {
      this.playing.set(true);
      this.start();
    }
  }

  private start(): void {
    this.phaseStart = performance.now();
    this.lastTime = this.phaseStart;
    this.frameId = requestAnimationFrame((now) => this.frame(now));
  }

  private frame(now: number): void {
    const gap = now - this.lastTime;
    this.lastTime = now;
    if (gap > MAX_GAP) {
      this.phaseStart += gap;
    }
    const reduced = this.reducedMotion();
    const hold = reduced ? HOLD_REDUCED : HOLD;
    const turn = reduced ? 0 : TURN;
    const elapsed = now - this.phaseStart;
    if (elapsed < hold) {
      this.position.set(this.step);
    } else if (elapsed < hold + turn) {
      this.position.set(this.step + easeInOut((elapsed - hold) / turn));
    } else {
      this.step = (this.step + 1) % COUPE_COUNT;
      this.phaseStart += hold + turn;
      this.position.set(this.step);
    }
    this.frameId = requestAnimationFrame((next) => this.frame(next));
  }

  private observeSize(destroyRef: DestroyRef): void {
    const el = this.section().nativeElement;
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

  private watchReducedMotion(destroyRef: DestroyRef): void {
    const query = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) {
      return;
    }
    const onChange = (event: MediaQueryListEvent) => this.reducedMotion.set(event.matches);
    query.addEventListener('change', onChange);
    destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
  }

  /** Largeur rapportée à la taille de police : ne dépend que du texte et de la police chargée. */
  private measureTitle(): void {
    const el = this.titleEl().nativeElement;
    const width = el.getBoundingClientRect().width;
    const fontSize = parseFloat(getComputedStyle(el).fontSize);
    if (width > 0 && fontSize > 0) {
      const ratio = width / fontSize;
      if (Math.abs(ratio - this.titleRatio()) / this.titleRatio() > 0.005) {
        this.titleRatio.set(ratio);
      }
    }
  }

  private slot(slot: TextSlot) {
    const u = this.u();
    return slot.centered
      ? { left: null, top: slot.top * u }
      : { left: slot.left * u, top: slot.top * u };
  }
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
