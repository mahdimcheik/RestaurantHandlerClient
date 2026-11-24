import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guards';

/**
 * Commande en ligne (E04) : carte, fiche produit, menu, panier, validation. La carte et le panier
 * portent leur propre barre du haut ; les fiches produit et menu s'ouvrent dans un dialogue
 * par-dessus la carte (routes enfants : adresses partageables, Retour du navigateur referme).
 */
export const SHOP_ROUTES: Routes = [
  {
    path: 'commander/valider',
    canActivate: [authGuard],
    title: $localize`:@@shop.checkoutTitle:Valider la commande`,
    loadComponent: () => import('./pages/checkout-page/checkout-page').then((m) => m.CheckoutPage),
  },
  {
    path: 'commander',
    title: $localize`:@@shop.cardTitle:La carte`,
    data: { header: false },
    loadComponent: () => import('./pages/card-page/card-page').then((m) => m.CardPage),
    children: [
      {
        path: 'produit/:id',
        title: $localize`:@@shop.productTitle:Produit`,
        loadComponent: () => import('./pages/product-page/product-page').then((m) => m.ProductPage),
      },
      {
        path: 'menu/:id',
        title: $localize`:@@shop.menuTitle:Menu`,
        loadComponent: () => import('./pages/menu-page/menu-page').then((m) => m.MenuPage),
      },
    ],
  },
  {
    path: 'panier',
    title: $localize`:@@shop.cartTitle:Panier`,
    data: { header: false },
    loadComponent: () => import('./pages/cart-page/cart-page').then((m) => m.CartPage),
  },
];
