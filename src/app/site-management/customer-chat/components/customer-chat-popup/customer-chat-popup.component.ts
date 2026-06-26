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
      ? 'S\u1ef1 c\u1ed1 \u0111\u00e3 \u0111\u01b0\u1ee3c kh\u1eafc ph\u1ee5c'
      : 'ZenTech \u0111\u00e3 ghi nh\u1eadn s\u1ef1 c\u1ed1';
  }

  protected getTicketStatusMessage(ticketStatus: CustomerTicketStatus): string {
    return this.isTicketResolved(ticketStatus)
      ? 'B\u1ea1n c\u00f3 th\u1ec3 th\u1eed l\u1ea1i. N\u1ebfu v\u1eabn ch\u01b0a \u1ed5n, h\u00e3y nh\u1eafn nh\u00e2n vi\u00ean h\u1ed7 tr\u1ee3.'
      : 'T\u1ee5i m\u00ecnh \u0111ang ki\u1ec3m tra. B\u1ea1n c\u00f3 th\u1ec3 nh\u1eafn th\u00eam th\u00f4ng tin n\u1ebfu c\u1ea7n.';
  }
}
