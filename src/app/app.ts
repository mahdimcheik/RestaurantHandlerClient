import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ActivationBanner } from './shared/ui/activation-banner/activation-banner';
import { UpdateBanner } from './shared/ui/update-banner/update-banner';
import { SiteFooter } from './shared/ui/site-footer/site-footer';
import { ToastStack } from './shared/ui/toast-stack/toast-stack';

/** Valeur de `data[key]` pour la route la plus profonde de la chaîne affichée qui la définit. */
function routeFlag(route: ActivatedRouteSnapshot, key: string): unknown {
  let value: unknown;
  for (let current: ActivatedRouteSnapshot | null = route; current; current = current.firstChild) {
    if (key in current.data) {
      value = current.data[key];
    }
  }
  return value;
}

@Component({
  imports: [RouterOutlet, SiteFooter, ActivationBanner, ToastStack, UpdateBanner],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);

  private readonly navigated = this.router.events.pipe(
    filter((event) => event instanceof NavigationEnd),
    map(() => this.router.routerState.snapshot.root),
  );

  /** Page sans en-tête ni pied de page (`data.bare`). */
  protected readonly bare = toSignal(
    this.navigated.pipe(map((root) => routeFlag(root, 'bare') === true)),
    { initialValue: false },
  );
}
