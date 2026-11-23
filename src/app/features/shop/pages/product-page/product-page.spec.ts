import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { fakeRealtime } from '../../../../core/realtime/testing';
import { clickButton, envelope, text } from '../../../../shared/testing';
import { CartStore } from '../../data-access/cart.store';
import { CARD, EmptyPage, settle } from '../../testing';
import { ProductPage } from './product-page';

describe('ProductPage', () => {
  let fixture: ComponentFixture<ProductPage>;
  let http: HttpTestingController;

  const addButton = () =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Ajouter au panier'),
    )!;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ProductPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: EmptyPage }]),
        fakeRealtime().provider,
      ],
    });
    fixture = TestBed.createComponent(ProductPage);
    fixture.componentRef.setInput('id', 'burger');
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    http.expectOne('/menu').flush(envelope(CARD));
    await settle();
  });

  afterEach(() => http.verify());

  it('attend le choix obligatoire, puis ajoute la ligne personnalisée au prix du devis', async () => {
    expect(text(fixture)).toContain('Burger');
    expect(text(fixture)).toContain('À choisir : Taille');
    expect(addButton().disabled).toBe(true);

    clickButton(fixture, 'Sans Oignon');
    [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.tile')]
      .find((tile) => tile.textContent?.includes('Grande'))!
      .click();
    await settle(310);

    const quote = http.expectOne('/orders/quote');
    expect(quote.request.body.lines).toEqual([
      {
        productId: 'burger',
        quantity: 1,
        modifications: [{ type: 'Remove', ingredientId: 'oignon' }],
        optionChoices: [{ choiceId: 'grande', quantity: 1 }],
      },
    ]);
    quote.flush(
      envelope({
        totalCents: 1200,
        lines: [
          { index: 0, name: 'Burger', quantity: 1, unitTotalCents: 1200, lineTotalCents: 1200 },
        ],
        vat: [],
      }),
    );
    await settle();
    expect(addButton().disabled).toBe(false);
    expect(addButton().textContent).toContain('12,00');

    addButton().click();
    await settle();
    const cart = TestBed.inject(CartStore);
    expect(cart.lines()).toHaveLength(1);
    expect(cart.lines()[0]).toMatchObject({ kind: 'product', productId: 'burger', quantity: 1 });
    expect(TestBed.inject(Router).url).toBe('/commander');
  });

  it('affiche le surcoût d’un remplacement avant l’ajout', () => {
    const options = [...(fixture.nativeElement as HTMLElement).querySelectorAll('option')].map(
      (option) => option.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(options).toContain('Remplacer par Chèvre (+ 1,50 €)');
  });
});
