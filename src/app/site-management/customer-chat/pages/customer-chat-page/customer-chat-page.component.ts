import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, OnInit, effect, inject, signal, untracked, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import {
  LucideArchive,
  LucideExternalLink,
  LucideFileText,
  LucideImage,
  LucideLink,
  LucideMessageCircle,
  LucidePlus,
  LucideRotateCcw,
  LucideSearch,
  LucideTrash2,
  LucideVideo,
  LucideX,
  LucideAlertTriangle,
  LucideCheckCircle,
  LucideWrench,
  LucideMoreVertical,
} from '@lucide/angular';
import { MediaPreviewDialogComponent } from '../../../../shared/components/media-preview-dialog/media-preview-dialog.component';
import { MediaPreviewItem } from '../../../../shared/components/media-preview-dialog/media-preview-dialog.model';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { CartStore } from '../../../cart/data-access/store/cart.store';
import { CategoryNavigationStore } from '../../../shared/data-access/store/category-navigation.store';
import { SiteHeaderComponent } from '../../../shared/site-header/site-header.component';
import { CustomerChatComposerComponent } from '../../components/customer-chat-composer/customer-chat-composer.component';
import { CustomerChatHeaderComponent } from '../../components/customer-chat-header/customer-chat-header.component';
import { CustomerMessageTimelineComponent } from '../../components/customer-message-timeline/customer-message-timeline.component';
import { CustomerSharedContentSidebarComponent } from '../../components/customer-shared-content-sidebar/customer-shared-content-sidebar.component';
import { CustomerChatSearchSidebarComponent } from '../../components/customer-chat-search-sidebar/customer-chat-search-sidebar.component';
import { CustomerUploadQueueComponent } from '../../components/customer-upload-queue/customer-upload-queue.component';
import { CustomerChatSharedItem, CustomerTicketStatus } from '../../data-access/models/customer-chat.models';
import { CustomerChatEventType } from '../../data-access/models/customer-chat.event';
import { CustomerChatStore } from '../../data-access/store/customer-chat.store';
import { ConfirmService } from '../../../../shared/components/confirm/confirm.service';

@Component({
  selector: 'app-customer-chat-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    SiteHeaderComponent,
    CustomerChatComposerComponent,
    CustomerChatHeaderComponent,
    CustomerMessageTimelineComponent,
    CustomerSharedContentSidebarComponent,
    CustomerChatSearchSidebarComponent,
    CustomerUploadQueueComponent,
    MediaPreviewDialogComponent,
    LucideExternalLink,
    LucideFileText,
    LucideImage,
    LucideLink,
    LucideMessageCircle,
    LucidePlus,
    LucideArchive,
    LucideRotateCcw,
    LucideSearch,
    LucideTrash2,
    LucideVideo,
    LucideX,
    LucideAlertTriangle,
    LucideWrench,
    LucideCheckCircle,
    LucideMoreVertical,
  ],
  templateUrl: './customer-chat-page.component.html',
  styleUrl: './customer-chat-page.component.css',
})
export class CustomerChatPageComponent implements OnInit {
  private readonly authSessionStore = inject(AuthSessionStore);
  private readonly categoryNavigationStore = inject(CategoryNavigationStore);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  protected readonly cartStore = inject(CartStore);
  protected readonly store = inject(CustomerChatStore);

  protected readonly navItems = this.categoryNavigationStore.navItems;
  protected readonly currentUser = this.authSessionStore.currentUser;
  protected readonly previewItem = signal<MediaPreviewItem | null>(null);
  protected readonly activeDropdownId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const message = this.authSessionStore.logoutSuccessMessage();

      if (message) {
        untracked(() => {
          this.toastService.success(message);
          this.authSessionStore.clearLogoutMessages();
          this.router.navigate(['/']);
        });
      }
    });

    effect(() => {
      const message = this.authSessionStore.logoutWarningMessage();

      if (message) {
        untracked(() => {
          this.toastService.warning(message);
          this.authSessionStore.clearLogoutMessages();
          this.router.navigate(['/']);
        });
      }
    });
  }

  ngOnInit(): void {
    this.store.openFullChat();

    if (!this.store.session()) {
      this.store.loadSession();
    }

  }

  protected openSearch(): void {
    this.store.dispatch({ type: CustomerChatEventType.SearchRequested });
  }

  protected closePage(): void {
    this.router.navigate(['/']);
  }

  protected onLogout(): void {
    this.authSessionStore.logout();
  }

  protected openPreview(item: MediaPreviewItem | CustomerChatSharedItem): void {
    if (item.type !== 'IMAGE' && item.type !== 'VIDEO') {
      return;
    }

    this.previewItem.set({
      type: item.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      title: item.title,
      url: item.url,
    });
  }

  protected closePreview(): void {
    this.previewItem.set(null);
  }

  toggleDropdown(event: Event, id: string): void {
    event.stopPropagation();
    this.activeDropdownId.set(this.activeDropdownId() === id ? null : id);
  }

  @HostListener('document:click')
  closeDropdown(): void {
    this.activeDropdownId.set(null);
  }

  protected confirmDelete(id?: string): void {
    this.confirmService.open({
      title: 'Xóa hội thoại',
      content: 'Bạn có chắc chắn muốn xóa vĩnh viễn cuộc hội thoại này không?',
    }).subscribe((confirmed) => {
      if (confirmed) {
        if (id) {
          this.store.deleteConversation(id);
        } else {
          this.store.deleteConversation();
        }
      }
    });
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
      return 'Tụi mình đang kiểm tra và sẽ cập nhật khi có kết quả. Bạn vẫn có thể nhắn thêm thông tin nếu cần.';
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
      ? 'Bạn có thể thử lại thao tác vừa gặp lỗi. Nếu vẫn chưa ổn, hãy nhắn với nhân viên hỗ trợ.'
      : 'Tụi mình đang kiểm tra và sẽ cập nhật khi có kết quả. Bạn vẫn có thể nhắn thêm thông tin nếu cần.';
  }
}
