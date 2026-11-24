import { NgOptimizedImage } from '@angular/common';
import { Component, ElementRef, input, model, viewChildren } from '@angular/core';
import { Icon } from '../../../../shared/ui/icon/icon';
import { CardSection } from '../../data-access/card-sections';

/** Identifiant de l'onglet d'une rubrique, qui étiquette le panneau des articles. */
export const sectionTabId = (sectionId: string) => `onglet-${sectionId}`;

/**
 * Rubriques de la carte en onglets verticaux, collés pendant le défilement des articles. Flèches,
 * Début et Fin déplacent le focus et la sélection (motif « tabs » de l'ARIA APG).
 */
@Component({
  selector: 'app-category-rail',
  imports: [NgOptimizedImage, Icon],
  host: {
    class: 'category-rail',
    role: 'tablist',
    'aria-orientation': 'vertical',
    '[attr.aria-label]': 'label',
  },
  template: `
    @for (section of sections(); track section.id; let index = $index) {
      <button
        #tab
        type="button"
        role="tab"
        class="category-rail__tab"
        [id]="tabId(section.id)"
        [attr.aria-selected]="section.id === selectedId()"
        [attr.aria-controls]="panelId()"
        [tabIndex]="section.id === selectedId() ? 0 : -1"
        (click)="selectedId.set(section.id)"
        (keydown)="onKeydown($event, index)"
      >
        <span class="category-rail__media" aria-hidden="true">
          @if (section.imageUrl) {
            <img
              class="category-rail__image"
              [ngSrc]="section.imageUrl"
              width="96"
              height="96"
              alt=""
            />
          } @else {
            <app-icon [name]="section.isMenus ? 'menus' : 'products'" />
          }
        </span>
        <span class="category-rail__name">{{ section.name }}</span>
      </button>
    }
  `,
})
export class CategoryRail {
  readonly sections = input.required<CardSection[]>();
  readonly selectedId = model.required<string>();
  /** Identifiant du panneau qui affiche la rubrique choisie. */
  readonly panelId = input.required<string>();

  protected readonly label = 'Rubriques de la carte';
  protected readonly tabId = sectionTabId;
  private readonly tabs = viewChildren<ElementRef<HTMLButtonElement>>('tab');

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const count = this.sections().length;
    const target =
      event.key === 'ArrowDown' || event.key === 'ArrowRight'
        ? (index + 1) % count
        : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
          ? (index - 1 + count) % count
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? count - 1
              : -1;
    if (target < 0) {
      return;
    }
    event.preventDefault();
    this.selectedId.set(this.sections()[target].id);
    this.tabs()[target]?.nativeElement.focus();
  }
}
