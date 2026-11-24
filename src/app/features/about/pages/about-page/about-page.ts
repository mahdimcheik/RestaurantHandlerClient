import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteTopbar } from '../../../../shared/ui/site-topbar/site-topbar';

/** À propos : un seul cuisinier, dix ans de restauration rapide et italienne, fait maison. */
@Component({
  selector: 'app-about-page',
  imports: [NgOptimizedImage, RouterLink, SiteTopbar],
  templateUrl: './about-page.html',
})
export class AboutPage {}
