import { Routes } from '@angular/router';
import { OwnerLayout } from './site-management/owner/layout/owner-layout/owner-layout';
import { SiteLayoutComponent } from './site-management/home/layout/site-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: SiteLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./site-management/home/home.component').then((m) => m.HomeComponent),
      },
      // Add more customer-facing pages here (products, about, etc.)
    ],
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./site-management/auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./site-management/auth/register/register.component').then(
            (m) => m.RegisterComponent,
          ),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./site-management/auth/forgot-password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent,
          ),
      },
      {
        path: 'verify-otp',
        loadComponent: () =>
          import('./site-management/auth/verify-otp/verify-otp.component').then(
            (m) => m.VerifyOtpComponent,
          ),
      },
    ],
  },
  {
    // Keep global error route untouched
    path: 'error',
    loadComponent: () =>
      import('./shared/components/system-error/system-error.component').then(
        (m) => m.SystemErrorComponent,
      ),
  },
  {
    path: 'owner',
    component: OwnerLayout,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./site-management/owner/bussiness-dashboard/bussiness-dashboard').then(
            (m) => m.BussinessDashboard,
          ),
      },
      {
        path: 'orders',
        loadComponent: () => import('./site-management/owner/orders/orders').then((m) => m.Orders),
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./site-management/owner/orders/order-detail/order-detail.component').then(
            (m) => m.OrderDetailComponent,
          ),
      },
    ],
  },
];
