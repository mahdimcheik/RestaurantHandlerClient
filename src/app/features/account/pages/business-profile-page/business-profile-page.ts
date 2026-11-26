import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, pattern, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { BusinessProfileDetails, BusinessProfileUpsert } from '../../../../core/api/generated';
import { apiErrorMessage } from '../../../../core/http/api-error';
import {
  focusFirstInvalid,
  lengthRule,
  nameRules,
  requiredRule,
} from '../../../../shared/forms/validation';
import { BusinessProfileService } from '../../../../shared/services/business-profile.service';
import { SiteTopbar } from '../../../../shared/ui/site-topbar/site-topbar';
import { TextField } from '../../../../shared/ui/text-field/text-field';

interface ProfileModel {
  siren: string;
  siret: string;
  legalName: string;
  vatNumber: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
}

const toModel = (profile: BusinessProfileDetails | null | undefined): ProfileModel => ({
  siren: profile?.siren ?? '',
  siret: profile?.siret ?? '',
  legalName: profile?.legalName ?? '',
  vatNumber: profile?.vatNumber ?? '',
  addressLine1: profile?.addressLine1 ?? '',
  addressLine2: profile?.addressLine2 ?? '',
  postalCode: profile?.postalCode ?? '',
  city: profile?.city ?? '',
});

const compact = (value: string) => value.replace(/\s+/g, '');
const optional = (value: string) => value.trim() || null;

export function toUpsert(model: ProfileModel): BusinessProfileUpsert {
  return {
    siren: compact(model.siren),
    siret: optional(compact(model.siret)),
    legalName: model.legalName.trim(),
    vatNumber: optional(compact(model.vatNumber).toUpperCase()),
    addressLine1: model.addressLine1.trim(),
    addressLine2: optional(model.addressLine2),
    postalCode: model.postalCode.trim(),
    city: model.city.trim(),
  };
}

/**
 * Devenir client professionnel (US-E05-6) : SIREN, raison sociale, TVA et adresse de
 * facturation, reprises sur les factures demandées au panier. Le serveur contrôle la clé du
 * SIREN et calcule le n° de TVA s'il est laissé vide.
 */
@Component({
  selector: 'app-business-profile-page',
  imports: [SiteTopbar, TextField],
  templateUrl: './business-profile-page.html',
})
export class BusinessProfilePage {
  private readonly profiles = inject(BusinessProfileService);

  protected readonly profile = rxResource({ stream: () => this.profiles.mine() });
  protected readonly current = computed(() =>
    this.profile.hasValue() ? this.profile.value() : undefined,
  );
  protected readonly isBusiness = computed(() => !!this.current());
  protected readonly loadError = computed(() =>
    this.profile.error() ? apiErrorMessage(this.profile.error()) : '',
  );

  protected readonly model = linkedSignal(() => toModel(this.current()));
  protected readonly form = form(this.model, (path) => {
    requiredRule(path.siren);
    pattern(path.siren, /^\s*(\d\s*){9}$/, { message: 'Le SIREN compte 9 chiffres.' });
    pattern(path.siret, /^\s*(\d\s*){14}$|^\s*$/, { message: 'Le SIRET compte 14 chiffres.' });
    nameRules(path.legalName, 200);
    pattern(path.vatNumber, /^\s*[Ff][Rr]\s*([0-9A-Za-z]\s*){2}(\d\s*){9}$|^\s*$/, {
      message: 'N° de TVA au format FRxx123456789.',
    });
    nameRules(path.addressLine1, 200);
    lengthRule(path.addressLine2, 200);
    requiredRule(path.postalCode);
    pattern(path.postalCode, /^\d{5}$/, { message: 'Le code postal compte 5 chiffres.' });
    nameRules(path.city, 100);
  });

  protected readonly sending = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.sending()) {
      return;
    }
    this.error.set('');
    this.notice.set('');
    await submit(this.form, {
      action: async () => {
        this.sending.set(true);
        try {
          const saved = await firstValueFrom(this.profiles.save(toUpsert(this.model())));
          this.profile.set(saved);
          this.notice.set(
            'Profil professionnel enregistré : vous pouvez demander une facture en commandant.',
          );
        } catch (error) {
          this.error.set(apiErrorMessage(error));
        } finally {
          this.sending.set(false);
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }

  protected async remove(): Promise<void> {
    if (this.sending()) {
      return;
    }
    this.error.set('');
    this.notice.set('');
    this.sending.set(true);
    try {
      await firstValueFrom(this.profiles.remove());
      this.profile.set(null);
      this.notice.set('Vous êtes de nouveau client particulier.');
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.sending.set(false);
    }
  }
}
