import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../../core/auth/session.service';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import {
  describeOpening,
  OpeningStateService,
} from '../../../../shared/services/opening-state.service';
import { PublicStore } from '../../../../shared/services/public-store.service';
import { SITE_DETAILS } from '../../../../shared/site-details';
import { Icon, IconName } from '../../../../shared/ui/icon/icon';
import { SiteTopbar } from '../../../../shared/ui/site-topbar/site-topbar';
import { formatLocal, restaurantDay } from '../../../../shared/utils/restaurant-time';
import { DAY_NAMES, WEEK } from '../../../../shared/utils/week';
import { HeroCarousel } from '../../components/hero-carousel/hero-carousel';
import { weeklyHours } from '../../home-format';

/** Moyen de joindre le restaurant, affiché en carte cliquable dans la section Contact. */
interface ContactChannel {
  label: string;
  value: string;
  href: string;
  icon: IconName;
  external: boolean;
}

/** Accueil : carrousel (nom, accès à la carte), état d'ouverture en direct, infos pratiques de l'API. */
@Component({
  selector: 'app-home-page',
  imports: [HeroCarousel, SiteTopbar, Icon, RouterLink],
  templateUrl: './home-page.html',
})
export class HomePage {
  private readonly store = inject(PublicStore);
  protected readonly session = inject(SessionService);
  private readonly opening = inject(OpeningStateService);

  protected readonly info = this.store.info.value;
  protected readonly title = computed(() => this.info()?.tradeName || 'Greenadine');
  protected readonly hours = computed(() => weeklyHours(this.info()?.hours ?? []));
  protected readonly closures = computed(() =>
    (this.info()?.upcomingClosures ?? []).map((closure) => ({
      id: closure.id,
      from: formatLocal(closure.startLocal),
      to: formatLocal(closure.endLocal),
      reason: closure.reason,
    })),
  );
  /** Nom du jour courant à Paris, pour signaler la ligne d'aujourd'hui. */
  protected readonly today = computed(() => {
    const weekday = new Date(`${restaurantDay()}T12:00:00Z`).getUTCDay();
    return DAY_NAMES[WEEK[(weekday + 6) % 7]];
  });
  /** Moyens de contact renseignés (API ou `SITE_DETAILS`) ; les autres sont omis. */
  protected readonly contacts = computed(() => {
    const info = this.info();
    const channels: ContactChannel[] = [];
    if (info?.phone) {
      const href = `tel:${info.phone.replace(/\s/g, '')}`;
      channels.push({ label: 'Appeler', value: info.phone, href, icon: 'phone', external: false });
    }
    if (SITE_DETAILS.email) {
      const href = `mailto:${SITE_DETAILS.email}`;
      channels.push({
        label: 'Écrire',
        value: SITE_DETAILS.email,
        href,
        icon: 'mail',
        external: false,
      });
    }
    if (info?.address) {
      const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.address)}`;
      channels.push({ label: 'Venir', value: info.address, href, icon: 'pin', external: true });
    }
    if (SITE_DETAILS.instagramUrl) {
      const href = SITE_DETAILS.instagramUrl;
      channels.push({
        label: 'Instagram',
        value: 'Suivre nos actualités',
        href,
        icon: 'camera',
        external: true,
      });
    }
    return channels;
  });
  protected readonly status = computed(() => this.opening.state()?.status);
  protected readonly openingText = computed(() => {
    const state = this.opening.state();
    return state ? describeOpening(state) : '';
  });

  constructor() {
    inject(RealtimeService).start();
    this.store.info.load();
    this.opening.load();
  }
}
