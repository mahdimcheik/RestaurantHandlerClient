import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guards';

/**
 * Commande en ligne (E04) : carte à consulter (`/carte`), carte de commande, fiche produit, menu, panier, validation. La carte et le panier
 * portent leur propre barre du haut ; les fiches produit et menu s'ouvrent dans un dialogue
 * par-dessus la carte (routes enfants : adresses partageables, Retour du navigateur referme).
 */
export const SHOP_ROUTES: Routes = [
  {
    path: 'commander/valider',
    canActivate: [authGuard],
    title: 'Valider la commande',
    data: { header: false },
    loadComponent: () => import('./pages/checkout-page/checkout-page').then((m) => m.CheckoutPage),
  },
  {
    path: 'commander',
    title: 'La carte',
    data: { header: false },
    loadComponent: () => import('./pages/card-page/card-page').then((m) => m.CardPage),
    children: [
      {
        path: 'produit/:id',
        title: 'Produit',
        loadComponent: () => import('./pages/product-page/product-page').then((m) => m.ProductPage),
      },
      {
        path: 'menu/:id',
        title: 'Menu',
        loadComponent: () => import('./pages/menu-page/menu-page').then((m) => m.MenuPage),
      },
    ],
  },
  {
    path: 'carte',
    title: 'La carte',
    data: { header: false },
    loadComponent: () =>
      import('./pages/menu-board-page/menu-board-page').then((m) => m.MenuBoardPage),
  },
  {
    path: 'panier',
    title: 'Panier',
    data: { header: false },
    loadComponent: () => import('./pages/cart-page/cart-page').then((m) => m.CartPage),
  },
];
