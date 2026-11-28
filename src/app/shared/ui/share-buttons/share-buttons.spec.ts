import { TestBed } from '@angular/core/testing';
import { ShareButtons } from './share-buttons';

describe('ShareButtons', () => {
  const setup = async (path = '/carte') => {
    TestBed.configureTestingModule({ imports: [ShareButtons] });
    const fixture = TestBed.createComponent(ShareButtons);
    fixture.componentRef.setInput('path', path);
    fixture.componentRef.setInput('text', 'La carte de Greenadine');
    fixture.componentRef.setInput('heading', 'Partager');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const button = (label: string) =>
      [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(label));
    return { fixture, el, button, url: new URL(path, document.baseURI).href };
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'clipboard');
    Reflect.deleteProperty(navigator, 'share');
  });

  it('propose WhatsApp et Facebook avec l’adresse absolue encodée', async () => {
    const { el, url } = await setup('/commander/produit/p 1');
    const [whatsapp, facebook] = [...el.querySelectorAll('a')];
    expect(whatsapp.getAttribute('href')).toBe(
      `https://wa.me/?text=${encodeURIComponent(`La carte de Greenadine ${url}`)}`,
    );
    expect(facebook.getAttribute('href')).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    );
    expect(url).toContain('/commander/produit/p%201');
    expect(whatsapp.getAttribute('rel')).toBe('noopener noreferrer');
    expect(el.getAttribute('role')).toBe('group');
    expect(el.getAttribute('aria-labelledby')).toBe(el.querySelector('.share__title')?.id);
  });

  it('masque la copie et la feuille de partage quand l’appareil ne les propose pas', async () => {
    const { button } = await setup();
    expect(button('Copier le lien')).toBeUndefined();
    expect(button('Plus d’options')).toBeUndefined();
  });

  it('copie le lien et le confirme', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { fixture, el, button, url } = await setup();

    button('Copier le lien')!.click();
    await fixture.whenStable();

    expect(writeText).toHaveBeenCalledWith(url);
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Lien copié');
  });

  it('signale une copie refusée', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('refus'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { fixture, el, button } = await setup();

    button('Copier le lien')!.click();
    await fixture.whenStable();

    expect(el.querySelector('[role="status"]')?.textContent).toContain('Copie impossible');
  });

  it('ouvre la feuille de partage de l’appareil', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('fermée', 'AbortError'));
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const { fixture, button, url } = await setup();

    button('Plus d’options')!.click();
    await fixture.whenStable();

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'La carte de Greenadine', url }),
    );
  });
});
