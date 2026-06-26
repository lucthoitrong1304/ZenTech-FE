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
}
