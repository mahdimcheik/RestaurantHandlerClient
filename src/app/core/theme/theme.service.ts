import { DOCUMENT, inject, Service, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';

/** Clé partagée avec public/theme-init.js, qui applique le thème avant le premier rendu. */
export const THEME_STORAGE_KEY = 'theme';

const PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

/** Préférence de thème : « system » suit l'appareil, les autres forcent data-theme sur <html>. */
@Service()
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storage = this.document.defaultView?.localStorage;

  private readonly _preference = signal<ThemePreference>(this.read());
  readonly preference = this._preference.asReadonly();

  constructor() {
    this.apply(this._preference());
  }

  set(preference: ThemePreference): void {
    this._preference.set(preference);
    this.apply(preference);
    try {
      if (preference === 'system') {
        this.storage?.removeItem(THEME_STORAGE_KEY);
      } else {
        this.storage?.setItem(THEME_STORAGE_KEY, preference);
      }
    } catch {
      // Stockage indisponible (navigation privée…) : le choix vaut pour la session en cours.
    }
  }

  private read(): ThemePreference {
    try {
      const stored = this.storage?.getItem(THEME_STORAGE_KEY);
      return PREFERENCES.find((p) => p === stored) ?? 'system';
    } catch {
      return 'system';
    }
  }

  private apply(preference: ThemePreference): void {
    const root = this.document.documentElement;
    if (preference === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', preference);
    }
  }
}
