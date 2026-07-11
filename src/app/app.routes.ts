import { Routes } from '@angular/router';

import { homeRedirectGuard } from '@/core/guards/home-redirect.guard';

export const routes: Routes = [
  // Dùng để điều hướng đúng UI dựa trên role sau khi đã login mà truy cập vô lại
  {
    path: '',
    canActivate: [homeRedirectGuard],
    loadComponent: () => import('@/site-management/customer/shell/pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'categories/:slug',
    loadComponent: () =>
      import('@/site-management/customer/catalog/listing/pages/product-listing-page/product-listing-page.component').then(
        m => m.ProductListingPageComponent
      )
  },
  {
    path: 'products',
    loadComponent: () =>
      import('@/site-management/customer/catalog/listing/pages/product-listing-page/product-listing-page.component').then(
        m => m.ProductListingPageComponent
      )
  },
  {
    path: 'products/:slug',
    loadComponent: () =>
      import('@/site-management/customer/catalog/detail/pages/product-detail-page/product-detail-page.component').then(
        m => m.ProductDetailPageComponent
      )
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('@/site-management/customer/cart/pages/cart-page/cart-page.component').then(
        m => m.CartPageComponent
      )
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('@/site-management/customer/cart/pages/checkout-page/checkout-page.component').then(
        m => m.CheckoutPageComponent
      )
  },
  {
    path: 'checkout/result',
    loadComponent: () =>
      import('@/site-management/customer/cart/pages/checkout-result-page/checkout-result-page.component').then(
        m => m.CheckoutResultPageComponent
      )
  },
  {
    path: 'reset-password',
    loadComponent: () => import('@/site-management/identity/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'chat',
    loadComponent: () =>
      import('@/site-management/customer/chat/pages/customer-chat-page/customer-chat-page.component').then(
        m => m.CustomerChatPageComponent
      )
  },
  {
    path: 'account',
    loadChildren: () => import('@/site-management/customer/account/account.routes').then(m => m.accountRoutes)
  },
  // Xác thực tài khoản
  {
    path: 'auth',
    children: [
      { path: 'login', loadComponent: () => import('@/site-management/identity/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('@/site-management/identity/register/register.component').then(m => m.RegisterComponent) },
      { path: 'forgot-password', loadComponent: () => import('@/site-management/identity/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
      { path: 'reset-password', loadComponent: () => import('@/site-management/identity/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) }
    ]
  },
  {
    path: 'management',
    loadChildren: () => import('@/site-management/management/management.routes').then(m => m.managementRoutes)
  },
  {
    path: 'admin',
    loadChildren: () => import('@/site-management/admin/admin.routes').then(m => m.adminRoutes)
  },
  { // Keep global error route untouched
    path: 'error',
    loadComponent: () => import('@/shared/components/system-error/system-error.component').then(m => m.SystemErrorComponent)
  }
];
