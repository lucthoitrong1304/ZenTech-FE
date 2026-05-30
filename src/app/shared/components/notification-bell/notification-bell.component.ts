import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { 
  LucideBell, 
  LucideBellOff, 
  LucideMessageCircle, 
  LucidePackage, 
  LucideTag, 
  LucideInfo 
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
    DatePipe
  ],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
})
export class NotificationBellComponent {
  readonly store = inject(NotificationStore);
  private readonly router = inject(Router);

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
    }
  }

  markAllAsRead() {
    this.store.markAllAsRead();
  }
}
