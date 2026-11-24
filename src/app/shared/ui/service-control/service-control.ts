import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { OpeningStateDto } from '../../../core/api/generated';
import { apiErrorMessage } from '../../../core/http/api-error';
import { describeOpening, OpeningStateService } from '../../services/opening-state.service';
import { RestaurantService } from '../../services/restaurant.service';
import { StoreService } from '../../services/store.service';
import { Icon, IconName } from '../icon/icon';

interface PauseChoice {
  minutes: number | null;
  label: string;
}

const ASAP_STEP = 5;
const ASAP_MAX = 240;

/**
 * État d'ouverture toujours visible dans la barre du back-office, et dialogue « Service » :
 * pause des commandes en ligne (15, 30, 60 min ou jusqu'à reprise), reprise, délai annoncé.
 */
@Component({
  selector: 'app-service-control',
  imports: [Icon],
  host: { class: 'service-control' },
  template: `
    <p class="service-control__state" role="status">
      <app-icon [name]="icon()" />
      <span>{{ label() }}</span>
    </p>
    <button
      type="button"
      class="btn btn--icon"
      [class.btn--outline]="!paused()"
      aria-haspopup="dialog"
      [disabled]="!opening.state()"
      (click)="open()"
    >
      @if (paused()) {
        <app-icon name="play" />
        <span>Reprendre…</span>
      } @else {
        <app-icon name="pause" />
        <span>Pause…</span>
      }
    </button>

    <dialog #dialog class="dialog" aria-labelledby="service-title">
      <div class="dialog__body">
        <h2 id="service-title">Commandes en ligne</h2>
        <p class="service-control__state">
          <app-icon [name]="icon()" />
          <span>{{ label() }}</span>
        </p>
        @if (opening.state()?.closureReason; as reason) {
          <p class="sheet__lead">{{ reason }}</p>
        }
        @if (error()) {
          <p class="alert alert--error" role="alert">{{ error() }}</p>
        }

        @if (paused()) {
          <button
            type="button"
            class="btn btn--icon choice-grid__wide"
            [disabled]="busy()"
            (click)="resume()"
          >
            <app-icon name="play" />
            <span>Reprendre les commandes</span>
          </button>
        } @else {
          <fieldset class="form__group">
            <legend class="field__label">Mettre en pause</legend>
            <div class="choice-grid">
              @for (choice of pauseChoices; track choice.minutes) {
                <button
                  type="button"
                  class="btn btn--outline"
                  [disabled]="busy()"
                  (click)="pause(choice.minutes)"
                >
                  {{ choice.label }}
                </button>
              }
            </div>
          </fieldset>
        }
        <p class="sheet__lead">
          La pause bloque seulement les commandes en ligne : la saisie au comptoir reste possible.
        </p>

        <fieldset class="form__group">
          <legend class="field__label">Délai de préparation annoncé</legend>
          <div class="stepper">
            <button
              type="button"
              class="icon-button"
              title="Réduire de 5 minutes"
              [disabled]="busy() || asap() <= 0"
              (click)="changeAsap(-step)"
            >
              −
            </button>
            <output class="stepper__value" aria-live="polite"> {{ asap() }} min </output>
            <button
              type="button"
              class="icon-button"
              title="Augmenter de 5 minutes"
              [disabled]="busy() || asap() >= max"
              (click)="changeAsap(step)"
            >
              +
            </button>
          </div>
        </fieldset>

        <div class="form__actions">
          <button type="button" class="btn btn--outline" (click)="close()">Fermer</button>
        </div>
      </div>
    </dialog>
  `,
})
export class ServiceControl {
  protected readonly opening = inject(OpeningStateService);
  private readonly restaurant = inject(RestaurantService);
  private readonly store = inject(StoreService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly step = ASAP_STEP;
  protected readonly max = ASAP_MAX;
  protected readonly pauseChoices: readonly PauseChoice[] = [
    { minutes: 15, label: '15 min' },
    { minutes: 30, label: '30 min' },
    { minutes: 60, label: '1 heure' },
    { minutes: null, label: `Jusqu'à reprise` },
  ];

  protected readonly paused = computed(() => this.opening.state()?.status === 'Paused');
  protected readonly asap = computed(() => this.opening.state()?.asapDelayMinutes ?? 0);
  protected readonly label = computed(() => {
    const state = this.opening.state();
    if (state) {
      return describeOpening(state);
    }
    return this.opening.error() ? `État d'ouverture indisponible` : 'Chargement…';
  });
  protected readonly icon = computed<IconName>(() => {
    switch (this.opening.state()?.status) {
      case 'Open':
        return 'store';
      case 'Paused':
        return 'pause';
      default:
        return 'clock';
    }
  });

  protected readonly busy = signal(false);
  protected readonly error = signal('');

  constructor() {
    this.opening.load();
  }

  protected open(): void {
    this.error.set('');
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected async pause(minutes: number | null): Promise<void> {
    if (await this.run(this.applied(this.restaurant.pause({ durationMinutes: minutes })))) {
      this.close();
    }
  }

  protected async resume(): Promise<void> {
    if (await this.run(this.applied(this.restaurant.resume()))) {
      this.close();
    }
  }

  protected async changeAsap(delta: number): Promise<void> {
    const next = Math.min(ASAP_MAX, Math.max(0, this.asap() + delta));
    await this.run(this.restaurant.updateAsapDelay(next).pipe(tap(() => this.opening.reload())));
  }

  /** Pause ou reprise : l'état renvoyé s'affiche aussitôt, les réglages en cache sont relus. */
  private applied(action: Observable<OpeningStateDto>): Observable<OpeningStateDto> {
    return action.pipe(
      tap((state) => {
        this.opening.apply(state);
        this.store.settings.reload();
      }),
    );
  }

  private async run(action: Observable<unknown>): Promise<boolean> {
    this.error.set('');
    this.busy.set(true);
    try {
      await firstValueFrom(action);
      return true;
    } catch (error) {
      this.error.set(apiErrorMessage(error));
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
