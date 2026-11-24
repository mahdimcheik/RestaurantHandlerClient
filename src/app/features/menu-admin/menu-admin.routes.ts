import { Routes } from '@angular/router';

const suffix = ' — Gestion';

export const MENU_ADMIN_ROUTES: Routes = [
  {
    path: 'categories',
    title: 'Catégories' + suffix,
    loadComponent: () =>
      import('./pages/category-list-page/category-list-page').then((m) => m.CategoryListPage),
  },
  {
    path: 'categories/nouvelle',
    title: 'Nouvelle catégorie' + suffix,
    loadComponent: () =>
      import('./pages/category-edit-page/category-edit-page').then((m) => m.CategoryEditPage),
  },
  {
    path: 'categories/:id',
    title: 'Catégorie' + suffix,
    loadComponent: () =>
      import('./pages/category-edit-page/category-edit-page').then((m) => m.CategoryEditPage),
  },
  {
    path: 'produits',
    title: 'Produits' + suffix,
    loadComponent: () =>
      import('./pages/product-list-page/product-list-page').then((m) => m.ProductListPage),
  },
  {
    path: 'produits/nouveau',
    title: 'Nouveau produit' + suffix,
    loadComponent: () =>
      import('./pages/product-edit-page/product-edit-page').then((m) => m.ProductEditPage),
  },
  {
    path: 'produits/:id',
    title: 'Produit' + suffix,
    loadComponent: () =>
      import('./pages/product-edit-page/product-edit-page').then((m) => m.ProductEditPage),
  },
  {
    path: 'menus',
    title: 'Menus' + suffix,
    loadComponent: () =>
      import('./pages/menu-list-page/menu-list-page').then((m) => m.MenuListPage),
  },
  {
    path: 'menus/nouveau',
    title: 'Nouveau menu' + suffix,
    loadComponent: () =>
      import('./pages/menu-edit-page/menu-edit-page').then((m) => m.MenuEditPage),
  },
  {
    path: 'menus/:id',
    title: 'Menu' + suffix,
    loadComponent: () =>
      import('./pages/menu-edit-page/menu-edit-page').then((m) => m.MenuEditPage),
  },
  {
    path: 'ingredients',
    title: 'Ingrédients' + suffix,
    loadComponent: () =>
      import('./pages/ingredient-list-page/ingredient-list-page').then((m) => m.IngredientListPage),
  },
  {
    path: 'options',
    title: `Groupes d'options` + suffix,
    loadComponent: () =>
      import('./pages/option-group-list-page/option-group-list-page').then(
        (m) => m.OptionGroupListPage,
      ),
  },
  {
    path: 'options/nouveau',
    title: `Nouveau groupe d'options` + suffix,
    loadComponent: () =>
      import('./pages/option-group-edit-page/option-group-edit-page').then(
        (m) => m.OptionGroupEditPage,
      ),
  },
  {
    path: 'options/:id',
    title: `Groupe d'options` + suffix,
    loadComponent: () =>
      import('./pages/option-group-edit-page/option-group-edit-page').then(
        (m) => m.OptionGroupEditPage,
      ),
  },
];
