import { Cart, Customization } from './cart';

const withoutOnion: Customization = {
  modifications: [{ type: 'Remove', ingredientId: 'onion' }],
  optionChoices: [],
  labels: ['Sans oignon'],
};

describe('Cart', () => {
  let cart: Cart;

  beforeEach(() => {
    cart = new Cart();
  });

  it('cumule un produit sans personnalisation, sépare un produit personnalisé', () => {
    cart.addProduct({ id: 'p1', name: 'Burger' });
    cart.addProduct({ id: 'p1', name: 'Burger' });
    cart.addProduct({ id: 'p1', name: 'Burger' }, withoutOnion);

    expect(cart.lines().map((line) => line.quantity)).toEqual([2, 1]);
    expect(cart.itemCount()).toBe(3);
    expect(cart.cartLines()).toEqual([
      { productId: 'p1', quantity: 2, modifications: [], optionChoices: [] },
      {
        productId: 'p1',
        quantity: 1,
        modifications: [{ type: 'Remove', ingredientId: 'onion' }],
        optionChoices: [],
      },
    ]);
  });

  it('envoie un menu avec un produit par emplacement et sa personnalisation', () => {
    cart.addMenu({ id: 'm1', name: 'Menu midi' }, [
      { slotId: 's1', productId: 'p1', productName: 'Burger', customization: withoutOnion },
      {
        slotId: 's2',
        productId: 'p2',
        productName: 'Coca',
        customization: {
          modifications: [],
          optionChoices: [{ choiceId: 'ice', quantity: 1 }],
          labels: ['Glaçons'],
        },
      },
    ]);

    expect(cart.cartLines()).toEqual([
      {
        menuId: 'm1',
        quantity: 1,
        choices: [
          {
            slotId: 's1',
            productId: 'p1',
            modifications: [{ type: 'Remove', ingredientId: 'onion' }],
            optionChoices: [],
          },
          {
            slotId: 's2',
            productId: 'p2',
            modifications: [],
            optionChoices: [{ choiceId: 'ice', quantity: 1 }],
          },
        ],
      },
    ]);
  });

  it('retire une ligne ramenée à zéro et retouche une personnalisation', () => {
    cart.addProduct({ id: 'p1', name: 'Burger' });
    cart.addProduct({ id: 'p2', name: 'Frites' });
    const [burger, fries] = cart.lines();

    cart.customize(burger.key, withoutOnion);
    cart.setQuantity(fries.key, 0);

    expect(cart.lines()).toHaveLength(1);
    expect(cart.lines()[0]).toMatchObject({ kind: 'product', customization: withoutOnion });
  });

  it('garde la clé d’idempotence tant que le panier n’est pas vidé', () => {
    const key = cart.idempotencyKey();
    cart.addProduct({ id: 'p1', name: 'Burger' });
    expect(cart.idempotencyKey()).toBe(key);

    cart.clear();
    expect(cart.isEmpty()).toBe(true);
    expect(cart.idempotencyKey()).not.toBe(key);
  });
});
