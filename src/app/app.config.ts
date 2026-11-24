import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  isDevMode,
} from '@angular/core';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideApiConfiguration } from './core/api/generated';
import { authInterceptor } from './core/auth/auth.interceptor';
import { idempotencyInterceptor } from './core/http/idempotency.interceptor';
import { SessionService } from './core/auth/session.service';
import { provideServiceWorker } from '@angular/service-worker';
import { IMAGE_CONFIG, IMAGE_LOADER } from '@angular/common';
import { CATALOG_IMAGE_WIDTHS, catalogImageLoader } from './core/images/catalog-image-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withFetch(),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
      withInterceptors([idempotencyInterceptor, authInterceptor]),
    ),
    provideApiConfiguration('/api'),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    provideAppInitializer(() => inject(SessionService).restore()),
    { provide: IMAGE_LOADER, useValue: catalogImageLoader },
    { provide: IMAGE_CONFIG, useValue: { breakpoints: CATALOG_IMAGE_WIDTHS } },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
