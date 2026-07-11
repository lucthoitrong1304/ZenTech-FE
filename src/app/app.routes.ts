import { Routes } from '@angular/router';

import { customerRoutes } from '@/site-management/customer/customer.routes';

export const routes: Routes = [
  ...customerRoutes,
  {
    path: 'reset-password',
    loadComponent: () => import('@/site-management/identity/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
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
