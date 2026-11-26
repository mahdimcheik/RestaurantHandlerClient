import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideFakeHub } from '../../../core/realtime/testing';
import { envelope } from '../../testing';
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
              { path: 'comptoir', component: Blank },
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

  it('propose les trois écrans de service en haut, sans menu à gauche', async () => {
    const root = await render('/service/cuisine');

    expect(tabs(root)).toEqual(['Cuisine', 'Comptoir', 'Commandes']);
    expect(root.querySelector('.admin__nav')).toBeNull();
    expect(root.querySelector('a[href="/gestion"]')?.textContent).toContain('Gestion');
  });

  it("signale l'écran courant, et lui seul", async () => {
    const root = await render('/service/comptoir');
    const current = [...root.querySelectorAll('[aria-current=page]')];

    expect(current.map((link) => link.textContent?.trim())).toEqual(['Comptoir']);
  });

  it('affiche le nombre de commandes à valider sur la touche Commandes', async () => {
    const root = await render('/service/cuisine');
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((request) => request.url === '/manage/orders')
      .flush(envelope([{ id: 'o1' }, { id: 'o2' }]));
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();

    expect(tabs(root)).toEqual(['Cuisine', 'Comptoir', 'Commandes 2 à valider']);
  });
});
