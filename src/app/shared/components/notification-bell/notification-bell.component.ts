import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { 
  LucideBell, 
  LucideBellOff, 
  LucideMessageCircle, 
  LucidePackage, 
  LucideTag, 
  LucideInfo,
  LucideUser,
  LucideArrowRightLeft
} from '@lucide/angular';
import { PopoverModule } from 'primeng/popover';
import { NotificationStore } from '../../../core/store/notification.store';
import { INotification, NotificationType } from '../../../core/models/notification.model';

@Component({
  selector: 'app-notification-bell',
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
    DatePipe
  ],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
})
export class NotificationBellComponent {
  readonly store = inject(NotificationStore);
  private readonly router = inject(Router);

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
    }
  }

  markAllAsRead() {
    this.store.markAllAsRead();
  }
}
