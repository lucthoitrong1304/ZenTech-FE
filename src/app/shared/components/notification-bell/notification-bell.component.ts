import { CommonModule, DatePipe } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { 
  LucideBell, 
  LucideBellOff, 
  LucideMessageCircle, 
  LucidePackage, 
  LucideTag, 
  LucideInfo,
  LucideUser,
  LucideArrowRightLeft,
  LucideCalendar,
  LucideCheckCircle,
  LucideXCircle,
  LucideClock
} from '@lucide/angular';
import { PopoverModule } from 'primeng/popover';
import { NotificationStore } from '../../../core/store/notification.store';
import { INotification, NotificationType } from '../../../core/models/notification.model';
import { AuthStorageService } from '../../../core/services/auth-storage.service';

@Component({
  selector: 'app-notification-bell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule, 
    PopoverModule,
    LucideBell,
    LucideBellOff,
    LucideMessageCircle,
    LucidePackage,
    LucideTag,
    LucideInfo,
    LucideUser,
    LucideArrowRightLeft,
    LucideCalendar,
    LucideCheckCircle,
    LucideXCircle,
    LucideClock,
    DatePipe
  ],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
})
export class NotificationBellComponent {
  readonly store = inject(NotificationStore);
  private readonly router = inject(Router);
  private readonly authStorageService = inject(AuthStorageService);

  @ViewChild('op') op!: any;

  constructor() {
    this.store.resetForAccount(this.authStorageService.getSession()?.accountId ?? null);
  }

  hide(): void {
    if (this.op) {
      this.op.hide();
    }
  }

  toggle(event: any, op: any) {
    op.toggle(event);
  }

  onNotificationClick(notification: INotification, op: any) {
    if (!notification.isRead) {
      this.store.markAsRead(notification.id);
    }
    
    op.hide();

    if (notification.type === NotificationType.CHAT_MESSAGE) {
      // Phân biệt route dựa trên URL hiện tại
      if (this.router.url.startsWith('/management')) {
        this.router.navigate(['/management/chat'], { queryParams: { conversationId: notification.referenceId } });
      } else {
        this.router.navigate(['/chat']);
      }
    } else if (notification.type === NotificationType.AGENT_REQUEST || notification.type === NotificationType.CONVERSATION_TRANSFER) {
      this.router.navigate(['/management/chat'], { queryParams: { conversationId: notification.referenceId } });
    } else if (notification.type === NotificationType.REQUEST_SUBMITTED) {
      this.router.navigate(['/management/approvals']);
    } else if (notification.type === NotificationType.REQUEST_APPROVED || notification.type === NotificationType.REQUEST_REJECTED) {
      this.router.navigate(['/management/requests']);
    } else if (notification.type === NotificationType.WORK_SCHEDULE) {
      this.router.navigate(['/management/work-schedules']);
    } else if (notification.type === NotificationType.ORDER_STATUS) {
      const currentUser = this.authStorageService.getCurrentUser();
      const isCustomer = currentUser?.roles.includes('CUSTOMER');
      if (isCustomer) {
        this.router.navigate(['/account/orders']);
      } else {
        this.router.navigate(['/management/orders']);
      }
    }
  }

  markAllAsRead() {
    this.store.markAllAsRead();
  }

  formatNotificationTitle(title: string): string {
    return normalizeLegacyNotificationText(title, TITLE_REPLACEMENTS);
  }

  formatNotificationContent(content: string): string {
    return normalizeLegacyNotificationText(content, CONTENT_REPLACEMENTS);
  }
}

const TITLE_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/^DON HANG DANG CHO THANH TOAN$/i, 'Đơn hàng đang chờ thanh toán'],
  [/^DAT HANG THANH CONG$/i, 'Đặt hàng thành công'],
  [/^CO DON HANG MOI$/i, 'Có đơn hàng mới'],
  [/^THANH TOAN THANH CONG$/i, 'Thanh toán thành công'],
  [/^DON HANG THANH TOAN THANH CONG$/i, 'Đơn hàng thanh toán thành công'],
  [/^CAP NHAT TRANG THAI DON HANG$/i, 'Cập nhật trạng thái đơn hàng'],
  [/^DON HANG DA BI HUY$/i, 'Đơn hàng đã bị hủy'],
  [/^YEU CAU TRA HANG DA DUOC DUYET$/i, 'Yêu cầu trả hàng đã được duyệt'],
  [/^YEU CAU TRA HANG BI TU CHOI$/i, 'Yêu cầu trả hàng bị từ chối'],
];

const CONTENT_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/\bda duoc tao\b/gi, 'đã được tạo'],
  [/\bda duoc dat thanh cong\b/gi, 'đã được đặt thành công'],
  [/\bda duoc thanh toan thanh cong\b/gi, 'đã được thanh toán thành công'],
  [/\bda duoc cap nhat trang thai thanh\b/gi, 'đã được cập nhật trạng thái thành'],
  [/\bda duoc duyet\b/gi, 'đã được duyệt'],
  [/\bDon hang\b/gi, 'Đơn hàng'],
  [/\bdon hang\b/gi, 'đơn hàng'],
  [/\bcua ban\b/gi, 'của bạn'],
  [/\bda duoc\b/gi, 'đã được'],
  [/\bdang cho thanh toan\b/gi, 'đang chờ thanh toán'],
  [/\bcho thanh toan\b/gi, 'chờ thanh toán'],
  [/\bqua cong\b/gi, 'qua cổng'],
  [/\bdat thanh cong\b/gi, 'đặt thành công'],
  [/\bthanh toan thanh cong\b/gi, 'thanh toán thành công'],
  [/\bcap nhat trang thai thanh\b/gi, 'cập nhật trạng thái thành'],
  [/\bda bi huy\b/gi, 'đã bị hủy'],
  [/\bYeu cau tra hang\b/gi, 'Yêu cầu trả hàng'],
  [/\byeu cau tra hang\b/gi, 'yêu cầu trả hàng'],
  [/\bcho don hang\b/gi, 'cho đơn hàng'],
  [/\bbi tu choi\b/gi, 'bị từ chối'],
];

function normalizeLegacyNotificationText(
  value: string,
  replacements: ReadonlyArray<[RegExp, string]>
): string {
  return replacements.reduce((current, [pattern, replacement]) => {
    return current.replace(pattern, replacement);
  }, value);
}
