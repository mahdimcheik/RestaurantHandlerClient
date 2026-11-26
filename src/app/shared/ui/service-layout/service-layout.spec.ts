import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideFakeHub } from '../../../core/realtime/testing';
import { ServiceLayout } from './service-layout';

@Component({ template: '<h1>Page</h1>' })
class Blank {}

describe('ServiceLayout', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'service',
            component: ServiceLayout,
            children: [
              { path: 'cuisine', component: Blank },
              { path: 'commandes', component: Blank },
            ],
          },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideFakeHub(),
      ],
    });
  });

  let harness: RouterTestingHarness;

  async function render(url: string): Promise<HTMLElement> {
    harness = await RouterTestingHarness.create(url);
    return harness.routeNativeElement as HTMLElement;
  }

  const tabs = (root: HTMLElement) =>
    [...root.querySelectorAll('nav[aria-label=Service] a')].map((link) =>
      link.textContent?.replace(/\s+/g, ' ').trim(),
    );

  it('propose les écrans de service en haut, sans comptoir ni menu à gauche', async () => {
    const root = await render('/service/cuisine');

    expect(tabs(root)).toEqual(['Cuisine', 'Commandes']);
    expect(root.querySelector('.admin__nav')).toBeNull();
    expect(root.querySelector('a[href="/gestion"]')?.textContent).toContain('Gestion');
    expect(root.textContent).not.toContain('à valider');
  });

  it("signale l'écran courant, et lui seul", async () => {
    const root = await render('/service/commandes');
    const current = [...root.querySelectorAll('[aria-current=page]')];

    expect(current.map((link) => link.textContent?.trim())).toEqual(['Commandes']);
  });
});
