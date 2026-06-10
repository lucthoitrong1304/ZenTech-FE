import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CustomerOrderDetailResponse } from '../../../account/data-access/models/account.models';
import { AccountService } from '../../../account/data-access/services/account.service';
import { CategoryNavigationStore } from '../../../shared/data-access/store/category-navigation.store';
import { SiteHeaderComponent } from '../../../shared/site-header/site-header.component';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { CartStore } from '../../data-access/store/cart.store';

@Component({
  selector: 'app-checkout-result-page',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DatePipe, SiteHeaderComponent],
  templateUrl: './checkout-result-page.component.html',
})
export class CheckoutResultPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly accountService = inject(AccountService);
  private readonly authSessionStore = inject(AuthSessionStore);
  private readonly categoryNavigationStore = inject(CategoryNavigationStore);
  protected readonly cartStore = inject(CartStore);

  protected readonly navItems = this.categoryNavigationStore.navItems;
  protected readonly currentUser = this.authSessionStore.currentUser;
  protected readonly order = signal<CustomerOrderDetailResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly gateway = this.route.snapshot.queryParamMap.get('gateway') || 'PAYMENT';
  protected readonly returnStatus = this.route.snapshot.queryParamMap.get('status') || 'pending';

  constructor() {
    const orderId = this.route.snapshot.queryParamMap.get('orderId');
    if (!orderId || orderId === 'null') {
      this.loading.set(false);
      this.error.set('Khong tim thay ma don hang trong ket qua thanh toan.');
      return;
    }

    this.accountService.getOrderDetail(orderId).subscribe({
      next: response => {
        this.order.set(response.data);
      },
      error: () => {
        this.error.set('Khong the tai thong tin don hang. Vui long kiem tra lich su don hang.');
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  protected get headline(): string {
    const order = this.order();
    if (order?.paymentStatus === 'SUCCESS') {
      return 'Thanh toan thanh cong';
    }
    if (this.returnStatus === 'failed') {
      return 'Thanh toan chua hoan tat';
    }
    if (this.returnStatus === 'invalid') {
      return 'Ket qua thanh toan can kiem tra';
    }
    return 'Dang cho xac nhan thanh toan';
  }

  protected get description(): string {
    const order = this.order();
    if (order?.paymentStatus === 'SUCCESS') {
      return 'ZenTech da ghi nhan thanh toan cua ban. Don hang se duoc xu ly som.';
    }
    if (this.returnStatus === 'failed') {
      return 'Cong thanh toan bao giao dich that bai hoac bi huy. Don hang van duoc luu de ban theo doi.';
    }
    if (this.returnStatus === 'invalid') {
      return 'Chu ky ket qua khong hop le. Vui long doi IPN hoac lien he ho tro neu can.';
    }
    return 'Cong thanh toan da tra ve, backend dang cho IPN xac nhan trang thai cuoi cung.';
  }

  protected onLogout(): void {
    this.authSessionStore.logout();
  }
}
