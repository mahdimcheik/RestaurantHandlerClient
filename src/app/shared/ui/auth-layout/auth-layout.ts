import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Mise en page des écrans d'authentification : image d'un côté, contenu de l'autre. */
@Component({
  selector: 'app-auth-layout',
  imports: [NgOptimizedImage, RouterLink],
  template: `
    <div class="auth">
      <div class="auth__media">
        <img ngSrc="images/auth.webp" alt="" fill priority sizes="50vw" />
      </div>
      <div class="auth__panel gutter">
        <a class="auth__brand" routerLink="/" i18n="@@brand">Greenadine</a>
        <div class="auth__content">
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class AuthLayout {}
