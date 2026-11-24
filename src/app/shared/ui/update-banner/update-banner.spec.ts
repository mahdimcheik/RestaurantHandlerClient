import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { Component } from '@angular/core';
import { UpdateBanner } from './update-banner';

@Component({ template: '' })
class Empty {}

describe('UpdateBanner', () => {
  it('propose de recharger une nouvelle version, sauf pendant la validation d’une commande', async () => {
    const versions = new Subject<VersionEvent>();
    TestBed.configureTestingModule({
      imports: [UpdateBanner],
      providers: [
        provideRouter([{ path: '**', component: Empty }]),
        {
          provide: SwUpdate,
          useValue: { isEnabled: true, versionUpdates: versions, unrecoverable: new Subject() },
        },
      ],
    });
    const fixture = TestBed.createComponent(UpdateBanner);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/commander/valider');
    versions.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('nouvelle version');

    await router.navigateByUrl('/commandes/o1');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Une nouvelle version est disponible.');
  });
});
