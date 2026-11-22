import { TestBed } from '@angular/core/testing';
import { ThemeSwitcher } from './theme-switcher';

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('checks system by default and applies the chosen theme', async () => {
    const fixture = TestBed.createComponent(ThemeSwitcher);
    await fixture.whenStable();
    const radios = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>(
      'input[type="radio"]',
    );
    expect(radios.length).toBe(3);
    expect(radios[0].checked).toBe(true);

    radios[2].click();
    await fixture.whenStable();
    expect(radios[2].checked).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
