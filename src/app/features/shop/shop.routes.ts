import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guards';

/** Commande en ligne (E04) : carte, fiche produit, menu, panier, validation. */
export const SHOP_ROUTES: Routes = [
  {
    path: 'commander',
    title: $localize`:@@shop.cardTitle:La carte`,
    loadComponent: () => import('./pages/card-page/card-page').then((m) => m.CardPage),
  },
  {
    path: 'commander/produit/:id',
    title: $localize`:@@shop.productTitle:Produit`,
    loadComponent: () => import('./pages/product-page/product-page').then((m) => m.ProductPage),
  },
  {
    path: 'commander/menu/:id',
    title: $localize`:@@shop.menuTitle:Menu`,
    loadComponent: () => import('./pages/menu-page/menu-page').then((m) => m.MenuPage),
  },
  {
    path: 'commander/valider',
    canActivate: [authGuard],
    title: $localize`:@@shop.checkoutTitle:Valider la commande`,
    loadComponent: () => import('./pages/checkout-page/checkout-page').then((m) => m.CheckoutPage),
  },
  {
    path: 'panier',
    title: $localize`:@@shop.cartTitle:Panier`,
    loadComponent: () => import('./pages/cart-page/cart-page').then((m) => m.CartPage),
  },
];
