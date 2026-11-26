import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DOCUMENT, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { filter, firstValueFrom, merge } from 'rxjs';
import { SessionService } from '../../../../core/auth/session.service';
import { apiErrorMessage, cartIssues } from '../../../../core/http/api-error';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { focusFirstInvalid, lengthRule } from '../../../../shared/forms/validation';
import { BusinessProfileService } from '../../../../shared/services/business-profile.service';
import { lineLabels } from '../../../../shared/ordering/cart';
import { OpeningStateService } from '../../../../shared/services/opening-state.service';
import { OrdersService } from '../../../../shared/services/orders.service';
import { PublicService } from '../../../../shared/services/public.service';
import { CheckboxField } from '../../../../shared/ui/checkbox-field/checkbox-field';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SiteTopbar } from '../../../../shared/ui/site-topbar/site-topbar';
import { TextareaField } from '../../../../shared/ui/textarea-field/textarea-field';
import { EurosPipe } from '../../../../shared/utils/money';
import { isPaymentUrl } from '../../../../shared/utils/payment-url';
import { formatTime } from '../../../../shared/utils/restaurant-time';
import { CartStore } from '../../data-access/cart.store';
import { quoteOf } from '../../data-access/quote';
import { customerOpeningText } from '../../opening-text';

const ASAP = 'asap';

/**
 * Validation de la commande (US-E04-3, US-E04-4, US-E04-5, US-E05-1, US-E05-6) : moment du
 * retrait, mode de paiement, note, facture pour un client professionnel. Le serveur revérifie tout ; un panier refusé renvoie au panier avec
 * les lignes en cause. Paiement en ligne : redirection vers SumUp, puis retour sur le suivi.
 */
@Component({
  selector: 'app-checkout-page',
  imports: [RouterLink, CheckboxField, EurosPipe, Icon, SiteTopbar, TextareaField],
  templateUrl: './checkout-page.html',
})
export class CheckoutPage {
  private readonly orders = inject(OrdersService);
  private readonly publicApi = inject(PublicService);
  private readonly opening = inject(OpeningStateService);
  private readonly session = inject(SessionService);
  private readonly businessProfiles = inject(BusinessProfileService);
  private readonly router = inject(Router);
  private readonly window = inject(DOCUMENT).defaultView;
  protected readonly cart = inject(CartStore);

  protected readonly asap = ASAP;
  protected readonly isManager = this.session.isManager;
  protected readonly labelsOf = lineLabels;

  protected readonly state = this.opening.state;
  protected readonly status = computed(() => this.state()?.status);
  protected readonly openingText = computed(() => {
    const state = this.state();
    return state ? customerOpeningText(state) : '';
  });
  protected readonly asapAvailable = computed(() => this.state()?.status === 'Open');

  protected readonly slots = rxResource({ stream: () => this.publicApi.slots() });
  protected readonly slotList = computed(() => (this.slots.hasValue() ? this.slots.value() : []));
  protected readonly options = rxResource({ stream: () => this.orders.checkoutOptions() });
  protected readonly optionsValue = computed(() =>
    this.options.hasValue() ? this.options.value() : undefined,
  );

  protected readonly pickup = linkedSignal<{ asap: boolean; first: string | undefined }, string>({
    source: () => ({ asap: this.asapAvailable(), first: this.slotList()[0]?.start }),
    computation: (source, previous) => {
      const kept = previous?.value;
      if (kept === ASAP ? source.asap : this.slotList().some((slot) => slot.start === kept)) {
        return kept ?? '';
      }
      return source.asap ? ASAP : (source.first ?? '');
    },
  });
  /** Seul moyen de paiement : la carte en ligne via SumUp (ADR-0013). */
  protected readonly onlinePayment = computed(() => !!this.optionsValue()?.onlinePaymentEnabled);

  /** Ni « dès que possible » ni créneau : impossible de commander maintenant. */
  protected readonly impossible = computed(
    () =>
      !!this.state() &&
      !this.asapAvailable() &&
      this.slots.hasValue() &&
      this.slotList().length === 0,
  );
  protected readonly quote = quoteOf(() => this.cart.cartLines());

  /** Profil professionnel du client : la case « facture » n'apparaît que s'il existe. */
  protected readonly business = rxResource({
    params: () => (this.isManager() ? undefined : true),
    stream: () => this.businessProfiles.mine(),
  });
  protected readonly businessProfile = computed(() =>
    this.business.hasValue() ? this.business.value() : null,
  );

  /** Facture cochée par défaut pour un client professionnel ; la note déjà saisie est gardée. */
  private readonly details = linkedSignal<boolean, { note: string; invoice: boolean }>({
    source: () => !!this.businessProfile(),
    computation: (isBusiness, previous) => ({
      note: previous?.value.note ?? '',
      invoice: isBusiness,
    }),
  });
  protected readonly detailsForm = form(this.details, (path) => lengthRule(path.note, 500));
  protected readonly sending = signal(false);
  protected readonly error = signal('');

  constructor() {
    const realtime = inject(RealtimeService);
    realtime.start();
    this.opening.load();
    merge(
      realtime.on('AvailabilityChanged').pipe(filter(({ scope }) => scope === 'opening')),
      realtime.resync,
    ).subscribe(() => this.slots.reload());
  }

  protected readonly apiError = apiErrorMessage;

  protected slotText(start: string, end: string): string {
    return `${formatTime(start)} – ${formatTime(end)}`;
  }

  protected asapText(): string {
    const minutes = this.state()?.asapDelayMinutes ?? 0;
    return `Dès que possible (prête dans ~${minutes} min)`;
  }

  /** Un échec garde le panier et sa clé : un nouvel essai ne crée pas de doublon (R10). */
  protected async place(event: Event): Promise<void> {
    event.preventDefault();
    const pickup = this.pickup();
    if (this.sending() || this.cart.isEmpty() || !pickup || !this.onlinePayment()) {
      return;
    }
    await submit(this.detailsForm, {
      action: async () => {
        this.error.set('');
        this.sending.set(true);
        try {
          const order = await firstValueFrom(
            this.orders.create({
              idempotencyKey: this.cart.idempotencyKey(),
              lines: this.cart.cartLines(),
              pickupMode: pickup === ASAP ? 'Asap' : 'Slot',
              slotStart: pickup === ASAP ? null : pickup,
              customerNote: this.details().note.trim() || null,
              requestInvoice: !!this.businessProfile() && this.details().invoice,
            }),
          );
          this.cart.clear();
          if (isPaymentUrl(order.paymentUrl)) {
            this.window?.location.assign(order.paymentUrl);
          } else {
            await this.router.navigate(['/commandes', order.id]);
          }
        } catch (error) {
          await this.failed(error);
        } finally {
          this.sending.set(false);
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }

  private async failed(error: unknown): Promise<void> {
    const issues = cartIssues(error);
    if (issues.length > 0) {
      this.cart.issues.set(issues);
      await this.router.navigateByUrl('/panier');
      return;
    }
    this.error.set(apiErrorMessage(error));
    if (error instanceof HttpErrorResponse && (error.status === 409 || error.status === 403)) {
      // Créneau pris, pause, paiement en ligne coupé : relire ce qui a pu changer.
      this.slots.reload();
      this.options.reload();
      this.opening.reload();
    }
  }
}
