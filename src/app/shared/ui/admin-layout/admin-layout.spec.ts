import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideFakeHub } from '../../../core/realtime/testing';
import { AdminLayout } from './admin-layout';

@Component({ template: '<h1>Page</h1>' })
class Blank {}

describe('AdminLayout', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'gestion',
            component: AdminLayout,
            children: [
              { path: '', component: Blank },
              { path: 'produits', component: Blank },
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

  it('garde un nom lisible pour chaque lien, même réduit en icône', async () => {
    const root = await render('/gestion');
    const links = [...root.querySelectorAll('.admin__links a, .admin__links button')];

    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Tableau de bord',
      'Écrans de service',
      'Statistiques',
      'Catégories',
      'Produits',
      'Menus',
      'Ingrédients',
      "Groupes d'options",
      'Ruptures',
      'Horaires et fermetures',
      'Restaurant',
      'Utilisateurs',
      'Retour au site',
      'Déconnexion',
    ]);
    expect(links.every((link) => link.querySelector('.icon')?.getAttribute('aria-hidden'))).toBe(
      true,
    );
  });

  it('pose le parfum du nouveau design et range les liens par rubrique', async () => {
    const root = await render('/gestion');
    const host = root.querySelector('app-admin-layout') ?? root;

    expect(host.classList).toContain('brand-ui');
    const groups = [...root.querySelectorAll('.admin__group ul')].map((list) =>
      root.querySelector(`#${list.getAttribute('aria-labelledby')}`)?.textContent?.trim(),
    );
    expect(groups).toEqual(['Service', 'Carte', 'Réglages']);
  });

  it('signale la page courante, et elle seule', async () => {
    const root = await render('/gestion/produits');
    const current = [...root.querySelectorAll('[aria-current=page]')];

    expect(current.map((link) => link.textContent?.trim())).toEqual(['Produits']);
  });
});
