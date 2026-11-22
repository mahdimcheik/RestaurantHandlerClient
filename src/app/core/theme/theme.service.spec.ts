import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  const root = document.documentElement;

  beforeEach(() => {
    localStorage.clear();
    root.removeAttribute('data-theme');
  });

  it('defaults to system without forcing a theme', () => {
    const theme = TestBed.inject(ThemeService);
    expect(theme.preference()).toBe('system');
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('forces and remembers an explicit theme', () => {
    const theme = TestBed.inject(ThemeService);
    theme.set('dark');
    expect(theme.preference()).toBe('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('returns to system by removing the forced theme', () => {
    const theme = TestBed.inject(ThemeService);
    theme.set('light');
    theme.set('system');
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('restores the stored preference and ignores unknown values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(TestBed.inject(ThemeService).preference()).toBe('light');
    expect(root.getAttribute('data-theme')).toBe('light');

    TestBed.resetTestingModule();
    localStorage.setItem(THEME_STORAGE_KEY, 'rose');
    expect(TestBed.inject(ThemeService).preference()).toBe('system');
  });
});
