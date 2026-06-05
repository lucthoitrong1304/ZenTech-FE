import { Routes } from '@angular/router';

import { homeRedirectGuard } from './core/guards/home-redirect.guard';

export const routes: Routes = [
  {
    path: '', // Home route pattern
    canActivate: [homeRedirectGuard],
    loadComponent: () => import('./site-management/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'categories/:slug',
    loadComponent: () =>
      import('./site-management/product-listing/pages/product-listing-page/product-listing-page.component').then(
        m => m.ProductListingPageComponent
      )
  },
  {
    path: 'products/:slug',
    loadComponent: () =>
      import('./site-management/product-detail/pages/product-detail-page/product-detail-page.component').then(
        m => m.ProductDetailPageComponent
      )
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./site-management/cart/pages/cart-page/cart-page.component').then(
        m => m.CartPageComponent
      )
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./site-management/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'chat',
    loadComponent: () =>
      import('./site-management/customer-chat/pages/customer-chat-page/customer-chat-page.component').then(
        m => m.CustomerChatPageComponent
      )
  },
  {
    path: 'account',
    loadChildren: () => import('./site-management/account/account.routes').then(m => m.accountRoutes)
  },
  {
    path: 'auth',
    children: [
      { path: 'login', loadComponent: () => import('./site-management/auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./site-management/auth/register/register.component').then(m => m.RegisterComponent) },
      { path: 'forgot-password', loadComponent: () => import('./site-management/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
      { path: 'reset-password', loadComponent: () => import('./site-management/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) }
    ]
  },
  {
    path: 'management',
    loadChildren: () => import('./site-management/management/management.routes').then(m => m.managementRoutes)
  },
  {
    path: 'admin',
    loadChildren: () => import('./site-management/admin/admin.routes').then(m => m.adminRoutes)
  },
  { // Keep global error route untouched
    path: 'error',
    loadComponent: () => import('./shared/components/system-error/system-error.component').then(m => m.SystemErrorComponent)
  }
];
