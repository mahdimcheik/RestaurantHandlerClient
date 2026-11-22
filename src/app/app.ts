import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteFooter } from './shared/ui/site-footer/site-footer';
import { SiteHeader } from './shared/ui/site-header/site-header';

@Component({
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
