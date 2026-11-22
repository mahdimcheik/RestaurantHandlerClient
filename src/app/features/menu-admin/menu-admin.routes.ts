import { Routes } from '@angular/router';

const suffix = $localize`:@@admin.titleSuffix: — Gestion`;

export const MENU_ADMIN_ROUTES: Routes = [
  {
    path: 'categories',
    title: $localize`:@@admin.categories:Catégories` + suffix,
    loadComponent: () =>
      import('./pages/category-list-page/category-list-page').then((m) => m.CategoryListPage),
  },
  {
    path: 'categories/nouvelle',
    title: $localize`:@@category.new:Nouvelle catégorie` + suffix,
    loadComponent: () =>
      import('./pages/category-edit-page/category-edit-page').then((m) => m.CategoryEditPage),
  },
  {
    path: 'categories/:id',
    title: $localize`:@@category.edit:Catégorie` + suffix,
    loadComponent: () =>
      import('./pages/category-edit-page/category-edit-page').then((m) => m.CategoryEditPage),
  },
  {
    path: 'produits',
    title: $localize`:@@admin.products:Produits` + suffix,
    loadComponent: () =>
      import('./pages/product-list-page/product-list-page').then((m) => m.ProductListPage),
  },
  {
    path: 'produits/nouveau',
    title: $localize`:@@product.new:Nouveau produit` + suffix,
    loadComponent: () =>
      import('./pages/product-edit-page/product-edit-page').then((m) => m.ProductEditPage),
  },
  {
    path: 'produits/:id',
    title: $localize`:@@product.edit:Produit` + suffix,
    loadComponent: () =>
      import('./pages/product-edit-page/product-edit-page').then((m) => m.ProductEditPage),
  },
  {
    path: 'options',
    title: $localize`:@@admin.options:Groupes d'options` + suffix,
    loadComponent: () =>
      import('./pages/option-group-list-page/option-group-list-page').then(
        (m) => m.OptionGroupListPage,
      ),
  },
  {
    path: 'options/nouveau',
    title: $localize`:@@optionGroup.new:Nouveau groupe d'options` + suffix,
    loadComponent: () =>
      import('./pages/option-group-edit-page/option-group-edit-page').then(
        (m) => m.OptionGroupEditPage,
      ),
  },
  {
    path: 'options/:id',
    title: $localize`:@@optionGroup.edit:Groupe d'options` + suffix,
    loadComponent: () =>
      import('./pages/option-group-edit-page/option-group-edit-page').then(
        (m) => m.OptionGroupEditPage,
      ),
  },
];
