import { Component, inject } from '@angular/core';
import { ThemePreference, ThemeService } from '../../../core/theme/theme.service';

@Component({
  selector: 'app-theme-switcher',
  template: `
    <fieldset class="segmented">
      <legend class="segmented__legend" i18n="@@theme.legend">Thème</legend>
      @for (option of options; track option.value) {
        <label class="segmented__option">
          <input
            class="visually-hidden"
            type="radio"
            name="theme"
            [value]="option.value"
            [checked]="theme.preference() === option.value"
            (change)="theme.set(option.value)"
          />
          {{ option.label }}
        </label>
      }
    </fieldset>
  `,
})
export class ThemeSwitcher {
  protected readonly theme = inject(ThemeService);
  protected readonly options: readonly { value: ThemePreference; label: string }[] = [
    { value: 'system', label: $localize`:@@theme.system:Système` },
    { value: 'light', label: $localize`:@@theme.light:Clair` },
    { value: 'dark', label: $localize`:@@theme.dark:Sombre` },
  ];
}
