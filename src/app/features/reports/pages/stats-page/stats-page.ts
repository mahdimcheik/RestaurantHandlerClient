import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { StatsPeriod } from '../../../../core/api/generated';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { StatsService } from '../../../../shared/services/stats.service';
import { EurosPipe } from '../../../../shared/utils/money';
import { formatLocal, restaurantDay } from '../../../../shared/utils/restaurant-time';
import { DAY_NAMES, WEEK } from '../../../../shared/utils/week';
import {
  BUCKETS,
  BucketMinutes,
  bucketLabel,
  DayFilter,
  formatMinutes,
  PERIODS,
  periodParams,
  peakRows,
  readBucket,
  readDay,
  readPeriod,
} from '../../reports-format';

const PERIOD_LABELS: Record<StatsPeriod, string> = {
  Day: $localize`:@@stats.period.day:Jour`,
  Week: $localize`:@@stats.period.week:Semaine`,
  Month: $localize`:@@stats.period.month:Mois`,
  Custom: $localize`:@@stats.period.custom:Dates libres`,
};

/**
 * Statistiques sur une période (US-E09-2, US-E09-3) : ventes par produit, menu et supplément,
 * puis heures de pointe. Tous les réglages vivent dans l'adresse (favori, bouton retour).
 */
@Component({
  selector: 'app-stats-page',
  host: { class: 'page' },
  imports: [EurosPipe],
  templateUrl: './stats-page.html',
})
export class StatsPage {
  private readonly stats = inject(StatsService);
  private readonly router = inject(Router);

  /** Paramètres d'adresse (liés par le routeur). */
  readonly periode = input<string>();
  readonly du = input<string>();
  readonly au = input<string>();
  readonly tranche = input<string>();
  readonly jour = input<string>();

  protected readonly today = restaurantDay();
  protected readonly choice = computed(() =>
    readPeriod(this.periode(), this.du(), this.au(), this.today),
  );
  protected readonly bucket = computed(() => readBucket(this.tranche()));
  protected readonly day = computed(() => readDay(this.jour()));

  protected readonly periods = PERIODS.map((value) => ({ value, label: PERIOD_LABELS[value] }));
  protected readonly buckets = BUCKETS;
  protected readonly days: readonly { value: DayFilter; label: string }[] = [
    { value: 'all', label: $localize`:@@stats.allDays:Tous les jours` },
    ...WEEK.map((value) => ({ value, label: DAY_NAMES[value] })),
  ];

  protected readonly sales = rxResource({
    params: () => periodParams(this.choice()),
    stream: ({ params }) => this.stats.productSales(params),
  });
  protected readonly peaks = rxResource({
    params: () => ({ ...periodParams(this.choice()), BucketMinutes: this.bucket() }),
    stream: ({ params }) => this.stats.peakHours(params),
  });

  protected readonly salesError = computed(() =>
    this.sales.error() ? apiErrorMessage(this.sales.error()) : '',
  );
  protected readonly peaksError = computed(() =>
    this.peaks.error() ? apiErrorMessage(this.peaks.error()) : '',
  );

  /** Période effectivement couverte, telle que l'API l'a résolue. */
  protected readonly range = computed(() => {
    if (!this.sales.hasValue()) {
      return '';
    }
    const report = this.sales.value();
    const from = formatLocal(`${report.from}T00:00:00`);
    return report.from === report.to
      ? from
      : $localize`:@@stats.range:du ${from}:from: au ${formatLocal(`${report.to}T00:00:00`)}:to:`;
  });

  protected readonly rows = computed(() =>
    peakRows(this.peaks.hasValue() ? this.peaks.value().buckets : [], this.day()),
  );

  protected readonly bucketLabel = bucketLabel;
  protected readonly formatMinutes = formatMinutes;

  protected setPeriod(period: StatsPeriod): void {
    const { from } = this.choice();
    this.navigate({ periode: period, du: from, au: period === 'Custom' ? from : null });
  }

  protected setFrom(value: string): void {
    if (value) {
      const { period, to } = this.choice();
      this.navigate({ du: value, au: period === 'Custom' && to < value ? value : undefined });
    }
  }

  protected setTo(value: string): void {
    if (value) {
      this.navigate({ au: value });
    }
  }

  protected setBucket(minutes: BucketMinutes): void {
    this.navigate({ tranche: minutes });
  }

  protected setDay(value: string): void {
    this.navigate({ jour: value === 'all' ? null : value });
  }

  private navigate(params: Record<string, string | number | null | undefined>): void {
    void this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge' });
  }
}
