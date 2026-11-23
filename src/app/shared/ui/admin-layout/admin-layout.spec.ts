import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideFakeHub } from '../../../core/realtime/testing';
import { envelope } from '../../testing';
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
      'Comptoir',
      'Commandes',
      'Cuisine',
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

  it('signale la page courante, et elle seule', async () => {
    const root = await render('/gestion/produits');
    const current = [...root.querySelectorAll('[aria-current=page]')];

    expect(current.map((link) => link.textContent?.trim())).toEqual(['Produits']);
  });

  it('affiche le nombre de commandes à valider sur le lien Commandes', async () => {
    const root = await render('/gestion');
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((request) => request.url === '/manage/orders')
      .flush(envelope([{ id: 'o1' }, { id: 'o2' }]));
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();

    const link = root.querySelector('a[href="/gestion/commandes"]');
    expect(link?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Commandes 2 à valider');
  });
});
