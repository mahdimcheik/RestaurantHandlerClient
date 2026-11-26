import { Component, computed, DOCUMENT, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter, map } from 'rxjs';

/** Pages où un rechargement ferait perdre une saisie en cours : on attend d'en sortir. */
const BUSY_PAGES = ['/commander/valider', '/service/comptoir'];

/**
 * Nouvelle version de l'application prête (service worker) : proposée, jamais imposée. Rien
 * n'apparaît pendant une validation de commande ou une saisie comptoir.
 */
@Component({
  selector: 'app-update-banner',
  template: `
    @if (visible()) {
      <div class="banner gutter" role="status">
        <p class="banner__text">Une nouvelle version est disponible.</p>
        <button type="button" class="btn-brand btn-brand--solid" (click)="reload()">
          Recharger
        </button>
      </div>
    }
  `,
})
export class UpdateBanner {
  private readonly updates = inject(SwUpdate);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  private readonly ready = signal(false);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  protected readonly visible = computed(
    () => this.ready() && !BUSY_PAGES.some((page) => this.url().startsWith(page)),
  );

  constructor() {
    if (!this.updates.isEnabled) {
      return;
    }
    this.updates.versionUpdates
      .pipe(
        filter((event) => event.type === 'VERSION_READY'),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.ready.set(true));
    // Cache du service worker incohérent : seule une recharge complète répare.
    this.updates.unrecoverable.pipe(takeUntilDestroyed()).subscribe(() => this.ready.set(true));
  }

  protected reload(): void {
    this.document.defaultView?.location.reload();
  }
}
