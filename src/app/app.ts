import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ActivationBanner } from './shared/ui/activation-banner/activation-banner';
import { SiteFooter } from './shared/ui/site-footer/site-footer';
import { SiteHeader } from './shared/ui/site-header/site-header';

/** Vrai si une route de la chaîne affichée demande une page sans en-tête ni pied de page (`data.bare`). */
function isBare(route: ActivatedRouteSnapshot): boolean {
  for (let current: ActivatedRouteSnapshot | null = route; current; current = current.firstChild) {
    if (current.data['bare'] === true) {
      return true;
    }
  }
  return false;
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
