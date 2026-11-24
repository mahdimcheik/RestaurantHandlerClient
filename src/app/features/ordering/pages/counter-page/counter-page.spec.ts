import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CategoryDetails, OptionGroupDetails } from '../../../../core/api/generated';
import {
  clickButton,
  envelope,
  polyfillDialog,
  submitForm,
  text,
} from '../../../../shared/testing';
import { order, product } from '../../testing';
import { CounterPage } from './counter-page';

const category: CategoryDetails = {
  id: 'c1',
  name: 'Burgers',
  position: 0,
  isActive: true,
  isArchived: false,
  activeProductCount: 2,
};

const drinks: OptionGroupDetails = {
  id: 'g1',
  label: 'Sauce',
  minChoices: 1,
  maxChoices: 1,
  maxPerChoice: 1,
  isArchived: false,
  position: 0,
  productCount: 1,
  choices: [
    { id: 'ketchup', name: 'Ketchup', position: 0, extraPriceCents: 0, isAvailable: true },
    { id: 'mayo', name: 'Mayo', position: 1, extraPriceCents: 0, isAvailable: true },
  ],
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Laisse passer les promesses en cours puis rafraîchit la vue (sans attendre le devis). */
async function settle(): Promise<void> {
  TestBed.tick();
  await wait(0);
  TestBed.tick();
}

describe('CounterPage', () => {
  let fixture: ComponentFixture<CounterPage>;
  let http: HttpTestingController;

  beforeAll(polyfillDialog);

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CounterPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(CounterPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    TestBed.tick();
    http.expectOne('/manage/categories').flush(envelope([category]));
    http
      .expectOne('/manage/products')
      .flush(
        envelope([
          product('p1', 'Burger', { categoryId: 'c1', priceCents: 950 }),
          product('p2', 'Frites', { categoryId: 'c1', optionGroups: [drinks], position: 1 }),
        ]),
      );
    http.expectOne('/manage/menus').flush(envelope([]));
    http.expectOne('/manage/ingredients').flush(envelope([]));
    http.expectOne('/restaurant/status').flush(envelope({ status: 'Open', asapDelayMinutes: 15 }));
    await settle();
  });

  afterEach(() => http.verify());

  async function quote(totalCents: number): Promise<void> {
    await wait(320);
    const request = http.expectOne('/orders/quote');
    request.flush(
      envelope({
        totalCents,
        vat: [],
        lines: [
          {
            index: 0,
            lineTotalCents: totalCents,
            name: '',
            quantity: 1,
            unitTotalCents: totalCents,
          },
        ],
      }),
    );
    await settle();
  }

  const tile = (name: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.tile')].find(
      (button) => button.querySelector('.tile__name')?.textContent?.trim() === name,
    )!;

  it('ajoute un produit en une touche et affiche le total du devis', async () => {
    tile('Burger').click();
    tile('Burger').click();
    await settle();
    expect(text(fixture)).toContain('2 articles');

    await wait(320);
    const request = http.expectOne('/orders/quote');
    expect(request.request.body).toEqual({
      lines: [{ productId: 'p1', quantity: 2, modifications: [], optionChoices: [] }],
    });
    request.flush(envelope({ totalCents: 1900, vat: [], lines: [] }));
    await settle();
    expect(fixture.nativeElement.querySelector('.ticket__total').textContent).toContain('19,00');
  });

  it('ouvre le choix obligatoire et ajoute la ligne à la deuxième touche', async () => {
    tile('Frites').click();
    await settle();
    expect(fixture.nativeElement.querySelector('dialog[open]')).not.toBeNull();

    tile('Mayo').click();
    await settle();
    expect(fixture.nativeElement.querySelector('dialog[open]')).toBeNull();
    expect(text(fixture)).toContain('Mayo');
    await quote(350);
  });

  it('réutilise la clé d’idempotence après un échec, puis affiche le numéro', async () => {
    tile('Burger').click();
    await quote(950);

    submitForm(fixture);
    await settle();
    const first = http.expectOne('/manage/orders/counter');
    const key = first.request.body.idempotencyKey;
    expect(key).toBeTruthy();
    first.flush({ message: 'Erreur', status: 500 }, { status: 500, statusText: 'Server Error' });
    await settle();
    expect(text(fixture)).toContain('Une erreur est survenue');

    submitForm(fixture);
    await settle();
    const retry = http.expectOne('/manage/orders/counter');
    expect(retry.request.body.idempotencyKey).toBe(key);
    expect(retry.request.body.customerFirstName).toBeNull();
    retry.flush(envelope(order({ dailyNumber: 27 })));
    await settle();

    expect(text(fixture)).toContain('N° 27');
    expect(text(fixture)).toContain('Reste à encaisser');

    clickButton(fixture, 'Nouvelle commande');
    await settle();
    expect(text(fixture)).toContain('Ticket · vide');
  });
});
