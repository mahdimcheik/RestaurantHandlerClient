import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { EurosPipe } from '../utils/money';
import {
  chosenCount,
  chosenLabels,
  CustomizationState,
  isSingleChoice,
  missingGroups,
  ruleText,
} from './customization';
import { ChoiceGroup, CustomizableProduct } from './model';
import { LineNote } from './line-note';
import { OptionGroup } from './option-group';

/**
 * Choix des options d'un produit pas à pas : un groupe par étape (Précédent, Suivant ou Passer
 * pour un groupe facultatif), puis un récapitulatif où chaque groupe se corrige avant de valider.
 * L'état vit chez le parent (`[(state)]`) : revenir en arrière ne perd aucun choix. Le prix vient
 * du devis du parent (`total`).
 */
@Component({
  selector: 'app-options-wizard',
  imports: [OptionGroup, LineNote, EurosPipe],
  template: `
    <section class="wizard" aria-labelledby="wizard-title">
      <p class="wizard__progress">
        {{ product().name }} · étape {{ step() + 1 }} sur {{ stepCount() }}
      </p>
      @if (current(); as group) {
        <h2
          #heading
          id="wizard-title"
          class="wizard__title display-title display-title--md"
          tabindex="-1"
        >
          {{ group.label }}
        </h2>
        <p class="wizard__rule" [class.wizard__rule--missing]="lacking(group)">
          {{ rule(group) }}
        </p>
        <div class="wizard__body">
          <app-option-group [group]="group" [(state)]="state" (picked)="onPicked(group)" />
        </div>
        <div class="wizard__actions">
          <button type="button" class="btn-brand" (click)="previous()">Précédent</button>
          @if (chosen(group) === 0 && group.min === 0) {
            <button type="button" class="btn-brand btn-brand--solid" (click)="next()">
              Passer
            </button>
          } @else {
            <button
              type="button"
              class="btn-brand btn-brand--solid"
              [disabled]="lacking(group)"
              (click)="next()"
            >
              Suivant
            </button>
          }
        </div>
      } @else {
        <h2
          #heading
          id="wizard-title"
          class="wizard__title display-title display-title--md"
          tabindex="-1"
        >
          Récapitulatif
        </h2>
        <dl class="wizard__body wizard__recap">
          @for (group of product().groups; track group.id; let index = $index) {
            <div class="wizard__recap-row">
              <dt class="wizard__recap-label">{{ group.label }}</dt>
              <dd class="wizard__recap-value">
                @if (labels(group).length > 0) {
                  {{ labels(group).join(', ') }}
                } @else {
                  Aucun
                }
                @if (lacking(group)) {
                  <span class="badge badge--danger">À choisir</span>
                }
              </dd>
              <dd class="wizard__recap-edit">
                <button type="button" class="link-button" (click)="edit(index)">
                  Modifier<span class="visually-hidden"> : {{ group.label }}</span>
                </button>
              </dd>
            </div>
          }
        </dl>
        @if (withNote()) {
          <app-line-note [(note)]="note" />
        }
        @if (issue()) {
          <p class="alert alert--error" role="alert">{{ issue() }}</p>
        }
        <div class="wizard__actions">
          <button type="button" class="btn-brand" (click)="previous()">Précédent</button>
          <button
            type="button"
            class="btn-brand btn-brand--solid wizard__submit"
            [disabled]="missing().length > 0"
            (click)="submit.emit()"
          >
            {{ submitLabel() }}
            @if (total() !== null) {
              <span aria-live="polite"> · {{ total() | euros }}</span>
            }
          </button>
        </div>
      }
    </section>
  `,
})
export class OptionsWizard {
  readonly product = input.required<CustomizableProduct>();
  readonly state = model.required<CustomizationState>();
  /** Note de l'article, saisie au récapitulatif ; absente pour un produit choisi dans un menu. */
  readonly withNote = input(true);
  readonly note = model('');
  /** Prix de la ligne selon le devis du serveur, `null` tant qu'il n'est pas connu. */
  readonly total = input<number | null>(null);
  readonly submitLabel = input('Ajouter au panier');
  /** Refus du devis, affiché sur le récapitulatif. */
  readonly issue = input<string | null | undefined>(null);
  readonly submit = output<void>();
  /** Précédent depuis la première étape : retour à la fiche. */
  readonly back = output<void>();

  /** Étape affichée : un groupe, ou le récapitulatif (`groups.length`). */
  protected readonly step = signal(0);
  /** Étape ouverte depuis le récapitulatif : Suivant y revient directement. */
  private readonly fromRecap = signal(false);

  protected readonly stepCount = computed(() => this.product().groups.length + 1);
  protected readonly current = computed(
    () => this.product().groups[this.step()] as ChoiceGroup | undefined,
  );
  protected readonly missing = computed(() => missingGroups(this.product(), this.state()));

  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');

  constructor() {
    // Chaque changement d'étape place le focus sur son titre (lu par les lecteurs d'écran).
    let shown = -1;
    afterRenderEffect(() => {
      const step = this.step();
      const heading = this.heading();
      if (heading && step !== shown) {
        if (shown !== -1) {
          heading.nativeElement.focus();
        }
        shown = step;
      }
    });
  }

  protected rule(group: ChoiceGroup): string {
    return ruleText(group.min, group.max);
  }

  protected chosen(group: ChoiceGroup): number {
    return chosenCount(group, this.state());
  }

  protected lacking(group: ChoiceGroup): boolean {
    return this.chosen(group) < group.min;
  }

  protected labels(group: ChoiceGroup): string[] {
    return chosenLabels(group, this.state());
  }

  /** Choix unique fait : on passe à la suite sans toucher Suivant. */
  protected onPicked(group: ChoiceGroup): void {
    if (isSingleChoice(group) && this.chosen(group) > 0) {
      this.next();
    }
  }

  protected next(): void {
    const group = this.current();
    if (!group || this.lacking(group)) {
      return;
    }
    if (this.fromRecap()) {
      this.fromRecap.set(false);
      this.step.set(this.product().groups.length);
      return;
    }
    this.step.update((step) => step + 1);
  }

  protected previous(): void {
    this.fromRecap.set(false);
    if (this.step() === 0) {
      this.back.emit();
      return;
    }
    this.step.update((step) => step - 1);
  }

  protected edit(index: number): void {
    this.fromRecap.set(true);
    this.step.set(index);
  }
}
