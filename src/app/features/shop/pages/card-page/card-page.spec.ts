import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fakeRealtime } from '../../../../core/realtime/testing';
import { NO_CUSTOMIZATION } from '../../../../shared/ordering/cart';
import { PublicStore } from '../../../../shared/services/public-store.service';
import { envelope } from '../../../../shared/testing';
import { CartStore } from '../../data-access/cart.store';
import { CARD, EmptyPage, settle } from '../../testing';
import { ProductPage } from '../product-page/product-page';
import { CardPage } from './card-page';

describe('CardPage', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let wide = false;

  const root = () => harness.routeNativeElement as HTMLElement;
  const tabs = () => [...root().querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const dishes = () =>
    [...root().querySelectorAll('.dish-card__name')].map((name) => name.textContent?.trim());
  const dialog = (selector: string) => root().querySelector<HTMLDialogElement>(selector)!;

  beforeAll(() => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.open = false;
    };
  });

  /** Ouvre l'adresse donnée, avec un écran étroit ou large, et répond à la carte. */
  async function setup(url: string, isWide = false): Promise<void> {
    wide = isWide;
    localStorage.clear();
    vi.stubGlobal('matchMedia', (query: string): Partial<MediaQueryList> => ({
      matches: wide,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(
          [
            {
              path: 'commander',
              component: CardPage,
              children: [{ path: 'produit/:id', component: ProductPage }],
            },
            { path: '**', component: EmptyPage },
          ],
          withComponentInputBinding(),
        ),
        fakeRealtime().provider,
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create(url);
    http.expectOne('/menu').flush(envelope(CARD));
    for (const request of http.match('/restaurant/status')) {
      request.flush(envelope(CARD.opening));
    }
    for (const request of http.match('/restaurant/info')) {
      request.flush(envelope({ name: 'Chez Nino' }));
    }
    await settle();
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    http.verify();
  });

  it('range les rubriques dans le rail et n’affiche que celle choisie', async () => {
    await setup('/commander');

    expect(tabs().map((tab) => tab.textContent?.trim())).toEqual(['Menus', 'Burgers']);
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    expect(dishes()).toEqual(['Menu midi']);

    tabs()[1].click();
    await settle();
    expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
    expect(dishes()).toEqual(['Burger', 'Cola']);
  });

  it('passe d’une rubrique à l’autre au clavier', async () => {
    await setup('/commander');

    tabs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await settle();
    expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
    expect(tabs()[1].tabIndex).toBe(0);
    expect(tabs()[0].tabIndex).toBe(-1);
    expect(document.activeElement).toBe(tabs()[1]);

    tabs()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    await settle();
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
  });

  it('affiche les ingrédients d’un produit dans un dialogue depuis le bouton info', async () => {
    await setup('/commander');
    tabs()[1].click();
    await settle();

    const buttons = [...root().querySelectorAll<HTMLButtonElement>('.dish-tile__info')];
    expect(buttons.map((button) => button.textContent?.trim())).toEqual(['Informations : Burger']);

    buttons[0].click();
    await settle();
    const info = dialog('[aria-labelledby="ingredients-title"]');
    expect(info.open).toBe(true);
    expect(info.querySelector('#ingredients-title')?.textContent?.trim()).toBe('Burger');
    expect(
      [...info.querySelectorAll('.ingredient-list__name')].map((name) => name.textContent),
    ).toEqual(['Oignon', 'Cheddar']);
    expect(TestBed.inject(Router).url).toBe('/commander');
  });

  it('sur téléphone, montre le bandeau du panier qui ouvre le détail de la commande', async () => {
    await setup('/commander');
    expect(root().querySelector('.order-bar')).toBeNull();

    const cart = TestBed.inject(CartStore);
    cart.addProduct(TestBed.inject(PublicStore).products().get('cola')!, NO_CUSTOMIZATION);
    await settle(310);
    http.expectOne('/orders/quote').flush(
      envelope({
        totalCents: 300,
        lines: [{ index: 0, name: 'Cola', quantity: 1, unitTotalCents: 300, lineTotalCents: 300 }],
        vat: [],
      }),
    );
    await settle();

    const bar = root().querySelector<HTMLButtonElement>('.order-bar__button')!;
    expect(bar.textContent).toContain('1 article');
    expect(bar.textContent).toContain('3,00');
    expect(root().querySelector('.order-aside')).toBeNull();

    bar.click();
    await settle();
    expect(dialog('.order-dialog--cart').open).toBe(true);
    expect(dialog('.order-dialog--cart').textContent).toContain('1 × Cola');

    cart.remove(cart.lines()[0].key);
    await settle();
    expect(dialog('.order-dialog--cart').open).toBe(false);
    expect(root().querySelector('.order-bar')).toBeNull();
  });

  it('sur grand écran, affiche le détail de la commande à droite', async () => {
    await setup('/commander', true);

    expect(root().querySelector('.order-aside')?.textContent).toContain('Votre panier est vide.');
    expect(root().querySelector('.order-bar')).toBeNull();
  });

  it('ouvre la fiche produit dans un dialogue par-dessus la carte, et le referme', async () => {
    await setup('/commander/produit/cola');

    expect(dialog('[aria-labelledby="sheet-title"]').open).toBe(true);
    expect(dialog('[aria-labelledby="sheet-title"]').textContent).toContain('Cola');
    expect(tabs()).toHaveLength(2);

    root()
      .querySelector<HTMLButtonElement>('[aria-labelledby="sheet-title"] .order-dialog__close')!
      .click();
    await settle();
    expect(TestBed.inject(Router).url).toBe('/commander');
    expect(dialog('[aria-labelledby="sheet-title"]').open).toBe(false);
  });
});
