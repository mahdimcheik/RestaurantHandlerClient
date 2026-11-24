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

  const buttonWith = (label: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) =>
      b.textContent?.includes(label),
    );
  const addButton = () => buttonWith('Ajouter au panier')!;

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

  it('ouvre d’office le choix des options, pas à pas, puis ajoute la ligne personnalisée au prix du devis', async () => {
    expect(text(fixture)).toContain('Burger');
    expect(buttonWith('Ajouter au panier')).toBeUndefined();

    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    expect(text(fixture)).toContain('Burger · étape 1 sur 2');
    expect(fixture.nativeElement.querySelector('.stepper')).toBeNull();
    clickButton(fixture, 'Sans Oignon');
    await settle();

    [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.tile')]
      .find((tile) => tile.textContent?.includes('Grande'))!
      .click();
    await settle(310);
    expect(text(fixture)).toContain('Récapitulatif');
    expect(text(fixture)).toContain('Taille Grande');

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
    expect(fixture.nativeElement.querySelector('.wizard')).not.toBeNull();

    addButton().click();
    await settle();
    const cart = TestBed.inject(CartStore);
    expect(cart.lines()).toHaveLength(1);
    expect(cart.lines()[0]).toMatchObject({ kind: 'product', productId: 'burger', quantity: 1 });
    expect(TestBed.inject(Router).url).toBe('/commander');
  });

  it('revient à la fiche par Précédent, puis rouvre les options', async () => {
    clickButton(fixture, 'Précédent');
    await settle();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    expect(dialog.open).toBe(false);

    clickButton(fixture, 'Sans Oignon');
    clickButton(fixture, 'Choisir les options');
    await settle();
    expect(dialog.open).toBe(true);
    expect(buttonWith('Sans Oignon')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('affiche le surcoût d’un remplacement avant l’ajout', () => {
    const options = [...(fixture.nativeElement as HTMLElement).querySelectorAll('option')].map(
      (option) => option.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(options).toContain('Remplacer par Chèvre (+ 1,50 €)');
  });
});
