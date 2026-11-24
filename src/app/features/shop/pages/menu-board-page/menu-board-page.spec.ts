import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fakeRealtime } from '../../../../core/realtime/testing';
import { envelope } from '../../../../shared/testing';
import { CARD, EmptyPage, settle } from '../../testing';
import { MenuBoardPage } from './menu-board-page';

describe('MenuBoardPage', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  const root = () => harness.routeNativeElement as HTMLElement;

  beforeAll(() => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.open = false;
    };
  });

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'carte', component: MenuBoardPage },
          { path: '**', component: EmptyPage },
        ]),
        fakeRealtime().provider,
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create('/carte');
    http.expectOne('/menu').flush(envelope(CARD));
    for (const request of http.match('/restaurant/status')) {
      request.flush(envelope(CARD.opening));
    }
    for (const request of http.match('/restaurant/info')) {
      request.flush(envelope({ name: 'Chez Nino' }));
    }
    await settle();
  });

  afterEach(() => http.verify());

  it('affiche toutes les rubriques à la suite avec leurs articles', () => {
    const sections = [...root().querySelectorAll('.menu-board__section')].map((section) => ({
      title: section.querySelector('h2')?.textContent?.trim(),
      dishes: [...section.querySelectorAll('.dish-card__name')].map((name) =>
        name.textContent?.trim(),
      ),
    }));
    expect(sections).toEqual([
      { title: 'Menus', dishes: ['Menu midi'] },
      { title: 'Burgers', dishes: ['Burger', 'Cola'] },
    ]);
    expect(root().querySelector('.order-bar, .order-aside')).toBeNull();
  });

  it('mène à chaque rubrique depuis la barre de liens', () => {
    const links = [...root().querySelectorAll<HTMLAnchorElement>('.menu-board__link')];
    expect(links.map((link) => [link.textContent?.trim(), link.getAttribute('href')])).toEqual([
      ['Menus', '/carte#rubrique-menus'],
      ['Burgers', '/carte#rubrique-c1'],
    ]);
    expect(root().querySelector('#rubrique-c1')).not.toBeNull();
  });

  it('ouvre la fiche de commande d’un article', () => {
    const hrefs = [...root().querySelectorAll('a.dish-card')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([
      '/commander/menu/midi',
      '/commander/produit/burger',
      '/commander/produit/cola',
    ]);
    expect(root().querySelector('.order-page__head a[href="/commander"]')).not.toBeNull();
  });

  it('affiche les ingrédients sur place depuis le bouton info', async () => {
    [...root().querySelectorAll<HTMLButtonElement>('.dish-tile__info')]
      .find((button) => button.textContent?.includes('Informations : Burger'))!
      .click();
    await settle();

    const info = root().querySelector<HTMLDialogElement>('[aria-labelledby="ingredients-title"]')!;
    expect(info.open).toBe(true);
    expect(info.querySelector('#ingredients-title')?.textContent?.trim()).toBe('Burger');
    expect(TestBed.inject(Router).url).toBe('/carte');
  });
});
