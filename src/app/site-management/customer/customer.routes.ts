import { Routes } from '@angular/router';
import { homeRedirectGuard } from '@/core/guards/home-redirect.guard';
import { CartStore } from './cart/data-access/store/cart.store';
import { CustomerChatStore } from './chat/data-access/store/customer-chat.store';
import { CustomerShellComponent } from './shell/customer-shell.component';
import { CategoryNavigationStore } from './shell/data-access/store/category-navigation.store';
import { CustomerShellStore } from './shell/data-access/store/customer-shell.store';

export const customerRoutes: Routes = [
  {
    path: '',
    component: CustomerShellComponent,
    providers: [CartStore, CategoryNavigationStore, CustomerChatStore, CustomerShellStore],
    children: [
      {
        path: '',
        canActivate: [homeRedirectGuard],
        loadComponent: () =>
          import('./shell/pages/home/home.component').then((module) => module.HomeComponent),
      },
      {
        path: 'categories/:slug',
        loadComponent: () =>
          import('./catalog/listing/pages/product-listing-page/product-listing-page.component').then(
            (module) => module.ProductListingPageComponent,
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./catalog/listing/pages/product-listing-page/product-listing-page.component').then(
            (module) => module.ProductListingPageComponent,
          ),
      },
      {
        path: 'products/:slug',
        loadComponent: () =>
          import('./catalog/detail/pages/product-detail-page/product-detail-page.component').then(
            (module) => module.ProductDetailPageComponent,
          ),
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./cart/pages/cart-page/cart-page.component').then((module) => module.CartPageComponent),
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('./cart/pages/checkout-page/checkout-page.component').then(
            (module) => module.CheckoutPageComponent,
          ),
      },
      {
        path: 'checkout/result',
        loadComponent: () =>
          import('./cart/pages/checkout-result-page/checkout-result-page.component').then(
            (module) => module.CheckoutResultPageComponent,
          ),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./chat/pages/customer-chat-page/customer-chat-page.component').then(
            (module) => module.CustomerChatPageComponent,
          ),
      },
      {
        path: 'account',
        loadChildren: () => import('./account/account.routes').then((module) => module.accountRoutes),
      },
    ],
  },
];
