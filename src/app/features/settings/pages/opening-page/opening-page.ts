import { Component, computed, inject, linkedSignal, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { applyEach, form, required, submit, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import {
  ClosureDetails,
  ClosureWrite,
  DayOfWeek,
  OpeningRangeDto,
  WeekHoursUpdate,
} from '../../../../core/api/generated';
import { apiErrorMessage } from '../../../../core/http/api-error';
import {
  focusFirstInvalid,
  lengthRule,
  requiredMessage,
} from '../../../../shared/forms/validation';
import { OpeningStateService } from '../../../../shared/services/opening-state.service';
import { RestaurantService } from '../../../../shared/services/restaurant.service';
import { StoreService } from '../../../../shared/services/store.service';
import { CheckboxField } from '../../../../shared/ui/checkbox-field/checkbox-field';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { formatLocal, nextDay, previousDay } from '../../../../shared/utils/restaurant-time';
import { DAY_NAMES, WEEK } from '../../../../shared/utils/week';

/** Plage saisie au format des champs `time` : « 11:30 ». */
interface RangeModel {
  start: string;
  end: string;
}

interface DayModel {
  day: DayOfWeek;
  ranges: RangeModel[];
}

interface WeekModel {
  days: DayModel[];
}

/** Plages de l'API (« 11:30:00 ») regroupées par jour, du lundi au dimanche. */
export function toWeek(ranges: readonly OpeningRangeDto[]): WeekModel {
  return {
    days: WEEK.map((day) => ({
      day,
      ranges: ranges
        .filter((range) => range.dayOfWeek === day)
        .map((range) => ({ start: range.start.slice(0, 5), end: range.end.slice(0, 5) }))
        .sort((a, b) => a.start.localeCompare(b.start)),
    })),
  };
}

export function toWeekUpdate(week: WeekModel): WeekHoursUpdate {
  return {
    ranges: week.days.flatMap((day) =>
      day.ranges.map((range) => ({
        dayOfWeek: day.day,
        start: `${range.start}:00`,
        end: `${range.end}:00`,
      })),
    ),
  };
}

/** Plage proposée à l'ajout : le midi, puis le soir. */
const suggestedRange = (count: number): RangeModel =>
  count === 0
    ? { start: '11:30', end: '14:30' }
    : count === 1
      ? { start: '18:30', end: '22:00' }
      : { start: '', end: '' };

interface ClosureModel {
  wholeDays: boolean;
  startDate: string;
  endDate: string;
  start: string;
  end: string;
  reason: string;
}

const emptyClosure = (): ClosureModel => ({
  wholeDays: true,
  startDate: '',
  endDate: '',
  start: '',
  end: '',
  reason: '',
});

/** Une journée entière va de minuit à minuit le lendemain du dernier jour (inclus). */
export function toClosureWrite(model: ClosureModel): ClosureWrite {
  const reason = model.reason.trim() || null;
  if (model.wholeDays) {
    const last = model.endDate || model.startDate;
    return {
      startLocal: `${model.startDate}T00:00:00`,
      endLocal: `${nextDay(last)}T00:00:00`,
      reason,
    };
  }
  return {
    startLocal: `${model.start.slice(0, 16)}:00`,
    endLocal: `${model.end.slice(0, 16)}:00`,
    reason,
  };
}

const isMidnight = (local: string) => local.slice(11, 16) === '00:00';

/** Période lisible : « Le jeu. 25 déc. 2026 », « Du … au … » (jours inclus). */
export function closurePeriod(closure: ClosureDetails): string {
  if (isMidnight(closure.startLocal) && isMidnight(closure.endLocal)) {
    const first = closure.startLocal.slice(0, 10);
    const last = previousDay(closure.endLocal.slice(0, 10));
    const from = formatLocal(`${first}T00:00:00`);
    return first === last
      ? $localize`:@@closure.oneDay:Le ${from}:from:`
      : $localize`:@@closure.days:Du ${from}:from: au ${formatLocal(`${last}T00:00:00`)}:to:`;
  }
  return $localize`:@@closure.range:Du ${formatLocal(closure.startLocal)}:from: au ${formatLocal(closure.endLocal)}:to:`;
}

const endAfterStart = $localize`:@@validation.endAfterStart:La fin doit suivre le début.`;

/** Horaires de la semaine (US-E03-1) et fermetures exceptionnelles (US-E03-2). */
@Component({
  selector: 'app-opening-page',
  imports: [TextField, CheckboxField, ConfirmDialog, Icon],
  templateUrl: './opening-page.html',
})
export class OpeningPage {
  private readonly store = inject(StoreService);
  private readonly restaurant = inject(RestaurantService);
  private readonly opening = inject(OpeningStateService);

  protected readonly dayNames = DAY_NAMES;

  // ---------- Horaires ----------

  protected readonly hoursLoading = this.store.openingHours.isLoading;
  protected readonly hoursLoadError = computed(() =>
    this.store.openingHours.error() ? apiErrorMessage(this.store.openingHours.error()) : '',
  );
  protected readonly week = linkedSignal(() => toWeek(this.store.openingHours.value()));
  protected readonly hasHours = computed(() => this.store.openingHours.value().length > 0);
  protected readonly hoursForm = form(this.week, (path) => {
    applyEach(path.days, (day) => {
      applyEach(day.ranges, (range) => {
        required(range.start, { message: requiredMessage });
        required(range.end, { message: requiredMessage });
        validate(range.end, ({ value, valueOf }) =>
          value() && valueOf(range.start) && value() <= valueOf(range.start)
            ? { kind: 'endAfterStart', message: endAfterStart }
            : undefined,
        );
      });
    });
  });
  protected readonly hoursError = signal('');
  protected readonly hoursNotice = signal('');

  // ---------- Fermetures ----------

  protected readonly showPast = signal(false);
  private readonly allClosures = rxResource({
    params: () => (this.showPast() ? true : undefined),
    stream: () => this.restaurant.closures(true),
  });
  protected readonly closures = computed(() =>
    (this.showPast() ? (this.allClosures.value() ?? []) : this.store.closures.value()).map(
      (closure) => ({ ...closure, period: closurePeriod(closure) }),
    ),
  );
  protected readonly closuresLoading = computed(() =>
    this.showPast() ? this.allClosures.isLoading() : this.store.closures.isLoading(),
  );
  protected readonly closuresLoadError = computed(() => {
    const error = this.showPast() ? this.allClosures.error() : this.store.closures.error();
    return error ? apiErrorMessage(error) : '';
  });

  protected readonly closure = signal(emptyClosure());
  protected readonly closureForm = form(this.closure, (path) => {
    required(path.startDate, {
      message: requiredMessage,
      when: ({ valueOf }) => valueOf(path.wholeDays),
    });
    validate(path.endDate, ({ value, valueOf }) =>
      valueOf(path.wholeDays) &&
      value() &&
      valueOf(path.startDate) &&
      value() < valueOf(path.startDate)
        ? { kind: 'endAfterStart', message: endAfterStart }
        : undefined,
    );
    required(path.start, {
      message: requiredMessage,
      when: ({ valueOf }) => !valueOf(path.wholeDays),
    });
    required(path.end, {
      message: requiredMessage,
      when: ({ valueOf }) => !valueOf(path.wholeDays),
    });
    validate(path.end, ({ value, valueOf }) =>
      !valueOf(path.wholeDays) && value() && valueOf(path.start) && value() <= valueOf(path.start)
        ? { kind: 'endAfterStart', message: endAfterStart }
        : undefined,
    );
    lengthRule(path.reason, 256);
  });
  protected readonly closureError = signal('');
  protected readonly closureNotice = signal('');

  private readonly removeDialog = viewChild.required(ConfirmDialog);
  protected readonly pending = signal<(ClosureDetails & { period: string }) | null>(null);
  protected readonly removing = signal(false);

  constructor() {
    this.store.openingHours.load();
    this.store.closures.load();
  }

  protected addRange(dayIndex: number): void {
    this.week.update((week) => ({
      days: week.days.map((day, i) =>
        i === dayIndex
          ? { ...day, ranges: [...day.ranges, suggestedRange(day.ranges.length)] }
          : day,
      ),
    }));
  }

  protected removeRange(dayIndex: number, rangeIndex: number): void {
    this.week.update((week) => ({
      days: week.days.map((day, i) =>
        i === dayIndex ? { ...day, ranges: day.ranges.filter((_, r) => r !== rangeIndex) } : day,
      ),
    }));
  }

  /** Recopie les plages d'un jour sur tous les jours qui le suivent dans la semaine. */
  protected copyForward(dayIndex: number): void {
    this.week.update((week) => {
      const ranges = week.days[dayIndex].ranges;
      return {
        days: week.days.map((day, i) =>
          i > dayIndex ? { ...day, ranges: ranges.map((range) => ({ ...range })) } : day,
        ),
      };
    });
    this.hoursNotice.set(
      $localize`:@@hours.copied:Plages recopiées. Enregistrez pour les appliquer.`,
    );
  }

  protected async saveHours(event: Event): Promise<void> {
    event.preventDefault();
    this.hoursError.set('');
    this.hoursNotice.set('');
    await submit(this.hoursForm, {
      action: async () => {
        try {
          await firstValueFrom(this.restaurant.updateOpeningHours(toWeekUpdate(this.week())));
          this.opening.reload();
          this.hoursNotice.set($localize`:@@hours.saved:Horaires enregistrés.`);
        } catch (error) {
          this.hoursError.set(apiErrorMessage(error));
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }

  protected async addClosure(event: Event): Promise<void> {
    event.preventDefault();
    this.closureError.set('');
    this.closureNotice.set('');
    await submit(this.closureForm, {
      action: async () => {
        try {
          await firstValueFrom(this.restaurant.addClosure(toClosureWrite(this.closure())));
          this.afterClosureChange();
          this.closure.set(emptyClosure());
          this.closureForm().reset();
          this.closureNotice.set($localize`:@@closure.added:Fermeture ajoutée.`);
        } catch (error) {
          this.closureError.set(apiErrorMessage(error));
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }

  protected askRemove(closure: ClosureDetails & { period: string }): void {
    this.pending.set(closure);
    this.removeDialog().open();
  }

  protected async remove(): Promise<void> {
    const closure = this.pending();
    if (!closure) {
      return;
    }
    this.closureError.set('');
    this.closureNotice.set('');
    this.removing.set(true);
    try {
      await firstValueFrom(this.restaurant.removeClosure(closure.id));
      this.afterClosureChange();
      this.closureNotice.set($localize`:@@closure.removed:Fermeture supprimée.`);
    } catch (error) {
      this.closureError.set(apiErrorMessage(error));
    } finally {
      this.removing.set(false);
      this.pending.set(null);
    }
  }

  private afterClosureChange(): void {
    this.opening.reload();
    if (this.showPast()) {
      this.allClosures.reload();
    }
  }
}
