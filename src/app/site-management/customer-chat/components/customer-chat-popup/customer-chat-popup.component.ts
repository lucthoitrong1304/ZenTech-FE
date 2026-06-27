import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideLogIn, LucideMessageCircle } from '@lucide/angular';
import { MediaPreviewDialogComponent } from '../../../../shared/components/media-preview-dialog/media-preview-dialog.component';
import { MediaPreviewItem } from '../../../../shared/components/media-preview-dialog/media-preview-dialog.model';
import { CustomerChatComposerComponent } from '../customer-chat-composer/customer-chat-composer.component';
import { CustomerChatHeaderComponent } from '../customer-chat-header/customer-chat-header.component';
import { CustomerChatLauncherComponent } from '../customer-chat-launcher/customer-chat-launcher.component';
import { CustomerMessageTimelineComponent } from '../customer-message-timeline/customer-message-timeline.component';
import { CustomerSharedContentSidebarComponent } from '../customer-shared-content-sidebar/customer-shared-content-sidebar.component';
import { CustomerUploadQueueComponent } from '../customer-upload-queue/customer-upload-queue.component';
import { CustomerChatStore } from '../../data-access/store/customer-chat.store';
import { CustomerTicketStatus } from '../../data-access/models/customer-chat.models';

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
  ],
  templateUrl: './customer-chat-popup.component.html',
  styleUrl: './customer-chat-popup.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerChatPopupComponent implements OnInit {
  private readonly router = inject(Router);
  protected readonly store = inject(CustomerChatStore);
  protected readonly previewItem = signal<MediaPreviewItem | null>(null);
  protected readonly loginQueryParams = computed(() => ({ returnUrl: this.router.url || '/' }));

  ngOnInit(): void {
    if (!this.store.session()) {
      this.store.loadSession();
    }
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
    return this.isTicketResolved(ticketStatus)
      ? 'Sự cố đã được khắc phục'
      : 'ZenTech đã ghi nhận sự cố';
  }

  protected getTicketStatusMessage(ticketStatus: CustomerTicketStatus): string {
    return this.isTicketResolved(ticketStatus)
      ? 'Bạn có thể thử lại. Nếu vẫn chưa ổn, hãy nhắn nhân viên hỗ trợ.'
      : 'Tụi mình đang kiểm tra. Bạn có thể nhắn thêm thông tin nếu cần.';
  }
}
