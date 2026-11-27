import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionService } from '../../../../core/auth/session.service';
import { HERO_SLIDES } from '../../hero-slides';
import { HeroSlider } from './hero-slider';

function setup(options: { reducedMotion: boolean; manager?: boolean }) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce') && options.reducedMotion,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  TestBed.configureTestingModule({
    imports: [HeroSlider],
    providers: [
      provideRouter([]),
      { provide: SessionService, useValue: { isManager: signal(options.manager ?? false) } },
    ],
  });
  const fixture = TestBed.createComponent(HeroSlider);
  fixture.componentRef.setInput('title', 'Chez Nino');
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const tabs = () => [...el.querySelectorAll<HTMLButtonElement>('.brand-slider__tab')];
  const activeTab = () => el.querySelector('.brand-slider__tab[aria-current="true"]');
  const visibleWords = () =>
    [...el.querySelectorAll('.brand-slider__slide:not(.brand-slider__slide--hidden)')].map((s) =>
      s.querySelector('.brand-slider__word')?.textContent?.trim(),
    );
  const click = (selector: string) => {
    el.querySelector<HTMLElement>(selector)!.click();
    fixture.detectChanges();
  };
  return { fixture, el, tabs, activeTab, visibleWords, click };
}

describe('HeroSlider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('affiche le nom du restaurant, un onglet par plat et le premier plat', () => {
    const { el, tabs, activeTab, visibleWords } = setup({ reducedMotion: true });

    expect(el.querySelector('h1')?.textContent).toContain('Chez Nino');
    expect(tabs().map((tab) => tab.textContent?.trim())).toEqual(HERO_SLIDES.map((s) => s.word));
    expect(activeTab()?.textContent?.trim()).toBe('Pizza');
    expect(visibleWords()).toEqual(['Pizza']);
    expect(el.querySelector('.brand-slider__cta')?.getAttribute('href')).toBe('/commander');
  });

  it('change de plat par les onglets et les flèches, en bouclant', () => {
    const { tabs, activeTab, visibleWords, click, fixture } = setup({ reducedMotion: true });

    tabs()[2].click();
    fixture.detectChanges();
    expect(activeTab()?.textContent?.trim()).toBe('Salade');
    expect(visibleWords()).toEqual(['Salade']);

    click('.brand-slider__arrow--prev');
    click('.brand-slider__arrow--prev');
    click('.brand-slider__arrow--prev');
    expect(activeTab()?.textContent?.trim()).toBe('Kebab');

    click('.brand-slider__arrow--next');
    expect(activeTab()?.textContent?.trim()).toBe('Pizza');
  });

  it('annonce le plat mis en avant dès le changement, pas en restant sur le même', () => {
    const { tabs, click, fixture } = setup({ reducedMotion: true });
    const tones: string[] = [];
    fixture.componentInstance.toneChange.subscribe((tone) => tones.push(tone));

    tabs()[0].click();
    click('.brand-slider__arrow--next');
    expect(tones).toEqual([HERO_SLIDES[1].tone]);
  });

  it('répond aux flèches du clavier', () => {
    const { el, activeTab, fixture } = setup({ reducedMotion: true });
    const section = el.querySelector('section')!;

    section.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(activeTab()?.textContent?.trim()).toBe('Tiramisu');
  });

  it('balaie la diapositive sortante pendant la transition', () => {
    const { el, click } = setup({ reducedMotion: false });
    vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(0);

    click('.brand-slider__arrow--next');
    const slides = [...el.querySelectorAll<HTMLElement>('.brand-slider__slide')];
    expect(slides[0].classList).not.toContain('brand-slider__slide--hidden');
    expect(slides[1].classList).not.toContain('brand-slider__slide--hidden');
    expect(slides[0].style.clipPath).toMatch(/^inset\(0(px)? 0% 0(px)? 0(px)?\)$/);
    expect(slides[1].style.zIndex).toBe('1');
    // L'onglet et le soulignement partent dès le début de la transition.
    expect(el.querySelector('.brand-slider__tab[aria-current="true"]')?.textContent?.trim()).toBe(
      'Tiramisu',
    );
  });

  it('permet d’arrêter et de relancer le défilement automatique', () => {
    const { el, click } = setup({ reducedMotion: true });

    expect(el.querySelector('.brand-slider__pause')?.textContent).toContain('Arrêter');
    click('.brand-slider__pause');
    expect(el.querySelector('.brand-slider__pause')?.textContent).toContain('Relancer');
  });

  it('mène un Manager à la carte plutôt qu’à la commande', () => {
    const { el } = setup({ reducedMotion: true, manager: true });

    expect(el.querySelector('.brand-slider__cta')?.getAttribute('href')).toBe('/carte');
  });
});
