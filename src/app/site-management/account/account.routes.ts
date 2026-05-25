import { Routes } from '@angular/router';
import { customerAuthGuard } from '../../core/guards/customer-auth.guard';

export const accountRoutes: Routes = [
  {
    path: '',
    canActivate: [customerAuthGuard],
    loadComponent: () =>
      import('./pages/account-layout/account-layout.component').then(
        m => m.AccountLayoutComponent
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/account-overview-page/account-overview-page.component').then(
            m => m.AccountOverviewPageComponent
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/order-history-page/order-history-page.component').then(
            m => m.OrderHistoryPageComponent
          ),
      },
      {
        path: 'addresses',
        loadComponent: () =>
          import('./pages/address-book-page/address-book-page.component').then(
            m => m.AddressBookPageComponent
          ),
      },
      {
        path: 'vouchers',
        loadComponent: () =>
          import('./pages/voucher-wallet-page/voucher-wallet-page.component').then(
            m => m.VoucherWalletPageComponent
          ),
      },
    ],
  },
];
