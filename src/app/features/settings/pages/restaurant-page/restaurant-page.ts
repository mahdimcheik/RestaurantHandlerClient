import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, pattern, submit } from '@angular/forms/signals';
import { firstValueFrom, tap } from 'rxjs';
import {
  RestaurantSettingsDetails,
  RestaurantSettingsWrite,
} from '../../../../core/api/generated';
import { apiErrorMessage } from '../../../../core/http/api-error';
import {
  focusFirstInvalid,
  integerRange,
  lengthRule,
  nameRules,
} from '../../../../shared/forms/validation';
import { OpeningStateService } from '../../../../shared/services/opening-state.service';
import { RestaurantService } from '../../../../shared/services/restaurant.service';
import { StoreService } from '../../../../shared/services/store.service';
import { ImageField } from '../../../../shared/ui/image-field/image-field';
import { NumberField } from '../../../../shared/ui/number-field/number-field';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { RestaurantDateTimePipe } from '../../../../shared/utils/restaurant-time';

interface SettingsModel {
  tradeName: string;
  legalName: string;
  address: string;
  phone: string;
  siret: string;
  vatNumber: string;
  asapDelayMinutes: number;
  slotDurationMinutes: number;
  slotCapacityOrders: number;
  minLeadMinutes: number;
  approvalTimeoutMinutes: number;
  pickupGraceMinutes: number;
  noShowThreshold: number;
  onlinePaymentExpiryMinutes: number;
}

/** Valeurs par défaut de l'API, avant le premier chargement. */
const toModel = (settings: RestaurantSettingsDetails | null): SettingsModel => ({
  tradeName: settings?.tradeName ?? '',
  legalName: settings?.legalName ?? '',
  address: settings?.address ?? '',
  phone: settings?.phone ?? '',
  siret: settings?.siret ?? '',
  vatNumber: settings?.vatNumber ?? '',
  asapDelayMinutes: settings?.asapDelayMinutes ?? 15,
  slotDurationMinutes: settings?.slotDurationMinutes ?? 15,
  slotCapacityOrders: settings?.slotCapacityOrders ?? 5,
  minLeadMinutes: settings?.minLeadMinutes ?? 20,
  approvalTimeoutMinutes: settings?.approvalTimeoutMinutes ?? 10,
  pickupGraceMinutes: settings?.pickupGraceMinutes ?? 30,
  noShowThreshold: settings?.noShowThreshold ?? 2,
  onlinePaymentExpiryMinutes: settings?.onlinePaymentExpiryMinutes ?? 30,
});

const optional = (value: string) => value.trim() || null;
const compact = (value: string) => value.replace(/\s+/g, '');

export function toSettingsWrite(model: SettingsModel): RestaurantSettingsWrite {
  return {
    tradeName: model.tradeName.trim(),
    legalName: optional(model.legalName),
    address: optional(model.address),
    phone: optional(model.phone),
    siret: optional(compact(model.siret)),
    vatNumber: optional(compact(model.vatNumber).toUpperCase()),
    asapDelayMinutes: model.asapDelayMinutes,
    slotDurationMinutes: model.slotDurationMinutes,
    slotCapacityOrders: model.slotCapacityOrders,
    minLeadMinutes: model.minLeadMinutes,
    approvalTimeoutMinutes: model.approvalTimeoutMinutes,
    pickupGraceMinutes: model.pickupGraceMinutes,
    noShowThreshold: model.noShowThreshold,
    onlinePaymentExpiryMinutes: model.onlinePaymentExpiryMinutes,
  };
}

/** Informations du restaurant (PWA, reçus) et paramètres de service (US-E10-5, US-E03-5/6). */
@Component({
  selector: 'app-restaurant-page',
  imports: [TextField, NumberField, ImageField, RestaurantDateTimePipe],
  templateUrl: './restaurant-page.html',
})
export class RestaurantPage {
  private readonly store = inject(StoreService);
  private readonly restaurant = inject(RestaurantService);
  private readonly opening = inject(OpeningStateService);

  protected readonly settings = this.store.settings;
  protected readonly loadError = computed(() =>
    this.settings.error() ? apiErrorMessage(this.settings.error()) : '',
  );
  protected readonly logoUrl = linkedSignal(() => this.settings.value()?.logoUrl);

  protected readonly model = linkedSignal(() => toModel(this.settings.value()));
  protected readonly form = form(this.model, (path) => {
    nameRules(path.tradeName, 128);
    lengthRule(path.legalName, 128);
    lengthRule(path.address, 256);
    lengthRule(path.phone, 32);
    pattern(path.siret, /^\s*(\d\s*){14}$|^\s*$/, {
      message: $localize`:@@restaurant.siretFormat:Le SIRET compte 14 chiffres.`,
    });
    pattern(path.vatNumber, /^\s*[Ff][Rr]\s*([0-9A-Za-z]\s*){2}(\d\s*){9}$|^\s*$/, {
      message: $localize`:@@restaurant.vatFormat:N° de TVA au format FRxx123456789.`,
    });
    integerRange(path.asapDelayMinutes, 0, 240);
    integerRange(path.slotDurationMinutes, 5, 120);
    integerRange(path.slotCapacityOrders, 1, 500);
    integerRange(path.minLeadMinutes, 0, 240);
    integerRange(path.approvalTimeoutMinutes, 1, 120);
    integerRange(path.pickupGraceMinutes, 0, 240);
    integerRange(path.noShowThreshold, 1, 20);
    integerRange(path.onlinePaymentExpiryMinutes, 5, 30);
  });
  protected readonly error = signal('');
  protected readonly notice = signal('');

  protected readonly history = rxResource({ stream: () => this.restaurant.settingsHistory(20) });

  protected readonly uploadLogo = (file: File) =>
    this.restaurant.uploadLogo(file).pipe(tap((settings) => this.logoUrl.set(settings.logoUrl)));

  protected readonly removeLogo = () =>
    this.restaurant.removeLogo().pipe(tap((settings) => this.logoUrl.set(settings.logoUrl)));

  constructor() {
    this.settings.load();
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set('');
    this.notice.set('');
    await submit(this.form, {
      action: async () => {
        try {
          await firstValueFrom(this.restaurant.updateSettings(toSettingsWrite(this.model())));
          this.history.reload();
          this.opening.reload();
          this.notice.set($localize`:@@sheet.saved:Modifications enregistrées.`);
        } catch (error) {
          this.error.set(apiErrorMessage(error));
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }
}
