import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
      dishes: [...section.querySelectorAll('.board-card__name')].map((name) =>
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
    const hrefs = [...root().querySelectorAll('a.board-card__link')].map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toEqual([
      '/commander/menu/midi',
      '/commander/produit/burger',
      '/commander/produit/cola',
    ]);
    expect(root().querySelector('.order-page__head a[href="/commander"]')).not.toBeNull();
  });

  it('affiche sur chaque carte ingrédients, options et composition du menu', () => {
    const details = (name: string) => {
      const card = [...root().querySelectorAll('.board-card')].find(
        (item) => item.querySelector('.board-card__name')?.textContent?.trim() === name,
      )!;
      return [...card.querySelectorAll('.board-card__detail')].map((detail) => [
        detail.querySelector('.board-card__label')?.textContent?.trim(),
        [...detail.querySelectorAll('.board-card__tag')].map((tag) =>
          tag.textContent?.replace(/\s+/g, ' ').trim(),
        ),
      ]);
    };
    expect(details('Burger')).toEqual([
      ['Ingrédients', ['Oignon', 'Cheddar']],
      ['Taille', ['Petite', 'Grande + 2,00 €']],
    ]);
    expect(details('Menu midi')).toEqual([
      ['Plat', ['Burger']],
      ['Boisson', ['Cola']],
    ]);
    expect(details('Cola')).toEqual([]);
    expect(root().querySelector('.dish-tile__info, dialog')).toBeNull();
  });
});
