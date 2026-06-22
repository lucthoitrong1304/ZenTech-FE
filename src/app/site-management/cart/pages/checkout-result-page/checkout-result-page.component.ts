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
      this.error.set('Không tìm thấy mã đơn hàng trong kết quả thanh toán.');
      return;
    }

    this.accountService.getOrderDetail(orderId).subscribe({
      next: response => {
        this.order.set(response.data);
      },
      error: () => {
        this.error.set('Không thể tải thông tin đơn hàng. Vui lòng kiểm tra lịch sử đơn hàng.');
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  protected get headline(): string {
    const order = this.order();
    if (order?.paymentStatus === 'SUCCESS') {
      return 'Thanh toán thành công';
    }
    if (this.returnStatus === 'failed') {
      return 'Thanh toán chưa hoàn tất';
    }
    if (this.returnStatus === 'invalid') {
      return 'Kết quả thanh toán cần kiểm tra';
    }
    return 'Đang chờ xác nhận thanh toán';
  }

  protected get description(): string {
    const order = this.order();
    if (order?.paymentStatus === 'SUCCESS') {
      return 'ZenTech đã ghi nhận thanh toán của bạn. Đơn hàng sẽ được xử lý sớm.';
    }
    if (this.returnStatus === 'failed') {
      return 'Cổng thanh toán báo giao dịch thất bại hoặc bị hủy. Đơn hàng vẫn được lưu để bạn theo dõi.';
    }
    if (this.returnStatus === 'invalid') {
      return 'Chữ ký kết quả không hợp lệ. Vui lòng đợi IPN hoặc liên hệ hỗ trợ nếu cần.';
    }
    return 'Cổng thanh toán đã trả về, hệ thống đang chờ IPN xác nhận trạng thái cuối cùng.';
  }

  protected onLogout(): void {
    this.authSessionStore.logout();
  }
}
