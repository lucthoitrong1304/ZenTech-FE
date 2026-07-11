import { Routes } from '@angular/router';
import { customerAuthGuard } from '@/core/guards/customer-auth.guard';
import { AccountStore } from '@/site-management/customer/account/data-access/store/account.store';

export const accountRoutes: Routes = [
  {
    path: '',
    canActivate: [customerAuthGuard],
    providers: [AccountStore],
    loadComponent: () =>
      import('@/site-management/customer/account/pages/account-layout/account-layout.component').then(
        m => m.AccountLayoutComponent
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      {
        path: 'overview',
        loadComponent: () =>
          import('@/site-management/customer/account/pages/account-overview-page/account-overview-page.component').then(
            m => m.AccountOverviewPageComponent
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('@/site-management/customer/account/pages/order-history-page/order-history-page.component').then(
            m => m.OrderHistoryPageComponent
          ),
      },
      {
        path: 'addresses',
        loadComponent: () =>
          import('@/site-management/customer/account/pages/address-book-page/address-book-page.component').then(
            m => m.AddressBookPageComponent
          ),
      },
      {
        path: 'vouchers',
        loadComponent: () =>
          import('@/site-management/customer/account/pages/voucher-wallet-page/voucher-wallet-page.component').then(
            m => m.VoucherWalletPageComponent
          ),
      },
    ],
  },
];
