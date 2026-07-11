import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideAlertTriangle, LucideCheckCircle, LucideLogIn, LucideMessageCircle, LucideWrench, LucideX } from '@lucide/angular';
import { filter, map } from 'rxjs';
import { MediaPreviewDialogComponent } from '@/shared/components/media-preview-dialog/media-preview-dialog.component';
import { MediaPreviewItem } from '@/shared/components/media-preview-dialog/media-preview-dialog.model';
import { CustomerChatComposerComponent } from '@/site-management/customer/chat/components/customer-chat-composer/customer-chat-composer.component';
import { CustomerChatHeaderComponent } from '@/site-management/customer/chat/components/customer-chat-header/customer-chat-header.component';
import { CustomerChatLauncherComponent } from '@/site-management/customer/chat/components/customer-chat-launcher/customer-chat-launcher.component';
import { CustomerMessageTimelineComponent } from '@/site-management/customer/chat/components/customer-message-timeline/customer-message-timeline.component';
import { CustomerSharedContentSidebarComponent } from '@/site-management/customer/chat/components/customer-shared-content-sidebar/customer-shared-content-sidebar.component';
import { CustomerUploadQueueComponent } from '@/site-management/customer/chat/components/customer-upload-queue/customer-upload-queue.component';
import { CustomerChatStore } from '@/site-management/customer/chat/data-access/store/customer-chat.store';
import { CustomerTicketStatus } from '@/site-management/shared/chat/data-access/models/customer-chat.models';

@Component({
  selector: 'app-customer-chat-popup',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CustomerChatComposerComponent,
    CustomerChatHeaderComponent,
    CustomerChatLauncherComponent,
    CustomerMessageTimelineComponent,
    CustomerSharedContentSidebarComponent,
    CustomerUploadQueueComponent,
    MediaPreviewDialogComponent,
    LucideLogIn,
    LucideMessageCircle,
    LucideX,
    LucideAlertTriangle,
    LucideWrench,
    LucideCheckCircle,
  ],
  templateUrl: './customer-chat-popup.component.html',
  styleUrl: './customer-chat-popup.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerChatPopupComponent {
  private readonly router = inject(Router);
  protected readonly store = inject(CustomerChatStore);
  protected readonly previewItem = signal<MediaPreviewItem | null>(null);
  protected readonly loginQueryParams = computed(() => ({ returnUrl: this.router.url || '/' }));
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  constructor() {
    if (!this.store.session()) {
      this.store.loadSession();
    }

    effect(() => this.updateRouteContext(this.currentUrl()), { allowSignalWrites: true });
  }

  protected openPreview(item: MediaPreviewItem): void {
    this.previewItem.set(item);
  }

  protected closePreview(): void {
    this.previewItem.set(null);
  }

  protected isTicketResolved(ticketStatus: CustomerTicketStatus): boolean {
    return ticketStatus.status === 'RESOLVED' || ticketStatus.status === 'CLOSED';
  }

  protected getTicketStatusTitle(ticketStatus: CustomerTicketStatus): string {
    if (this.isTicketResolved(ticketStatus)) {
      return 'Sự cố đã được khắc phục';
    }
    if (this.isIncident(ticketStatus)) {
      return 'Phát hiện sự cố hệ thống';
    }
    return 'Đội kỹ thuật đang khắc phục';
  }

  protected isIncident(ticketStatus: CustomerTicketStatus): boolean {
    return !!ticketStatus.ticketCode && ticketStatus.ticketCode.startsWith('INC-');
  }

  protected isTicket(ticketStatus: CustomerTicketStatus): boolean {
    return !!ticketStatus.ticketCode && ticketStatus.ticketCode.startsWith('TCK-');
  }

  protected getFriendlyTicketMessage(message: string | null | undefined): string {
    if (!message) {
      return 'Tụi mình đang kiểm tra. Bạn có thể nhắn thêm thông tin nếu cần.';
    }

    let friendly = message;
    
    if (friendly.includes('Cannot create MoMo payment') || friendly.includes('momo')) {
      friendly = friendly.replace(/Cannot create MoMo payment/i, 'Không thể khởi tạo thanh toán qua ví MoMo');
    }
    if (friendly.includes('checkout') || friendly.includes('Cannot checkout')) {
      friendly = friendly.replace(/Cannot checkout/i, 'Lỗi tiến trình đặt hàng & thanh toán (Checkout)');
    }
    if (friendly.includes('login') || friendly.includes('auth')) {
      friendly = friendly.replace(/login/i, 'Đăng nhập hệ thống').replace(/auth/i, 'Xác thực tài khoản');
    }
    
    // Clean up technical ticket title prefixes inside quotes for customers
    friendly = friendly.replace(/(?:Sửa lỗi sự cố|Khắc phục lỗi)\s+INC-\d+:\s*/gi, '');
    
    return friendly;
  }

  protected getTicketStatusMessage(ticketStatus: CustomerTicketStatus): string {
    if (ticketStatus.message) {
      return this.getFriendlyTicketMessage(ticketStatus.message);
    }
    return this.isTicketResolved(ticketStatus)
      ? 'Bạn có thể thử lại. Nếu vẫn chưa ổn, hãy nhắn nhân viên hỗ trợ.'
      : 'Tụi mình đang kiểm tra. Bạn có thể nhắn thêm thông tin nếu cần.';
  }

  private updateRouteContext(route: string): void {
    if (route.includes('/products/')) {
      return;
    }

    this.store.setPageContext({ route });
  }
}
