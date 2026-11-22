import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ActivationBanner } from './shared/ui/activation-banner/activation-banner';
import { SiteFooter } from './shared/ui/site-footer/site-footer';
import { SiteHeader } from './shared/ui/site-header/site-header';

/** Vrai si la route affichée demande une page sans en-tête ni pied de page (`data.bare`). */
function isBare(route: ActivatedRouteSnapshot): boolean {
  let current = route;
  while (current.firstChild) {
    current = current.firstChild;
  }
  return current.data['bare'] === true;
}

@Component({
  imports: [RouterOutlet, SiteHeader, SiteFooter, ActivationBanner],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);

  protected readonly bare = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => isBare(this.router.routerState.snapshot.root)),
    ),
    { initialValue: false },
  );
}
