import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
  HostListener,
} from '@angular/core';
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
import { MediaPreviewDialogComponent } from '@/shared/components/media-preview-dialog/media-preview-dialog.component';
import { MediaPreviewItem } from '@/shared/components/media-preview-dialog/media-preview-dialog.model';
import { ToastService } from '@/shared/components/toast/toast.service';
import { AuthSessionStore } from '@/site-management/identity/data-access/store/auth-session.store';
import { CartStore } from '@/site-management/customer/cart/data-access/store/cart.store';
import { CategoryNavigationStore } from '@/site-management/customer/shell/data-access/store/category-navigation.store';
import { SiteHeaderContainerComponent } from '@/site-management/customer/shell/components/site-header/site-header-container.component';
import { CustomerChatComposerComponent } from '@/site-management/customer/chat/components/customer-chat-composer/customer-chat-composer.component';
import { CustomerChatHeaderComponent } from '@/site-management/customer/chat/components/customer-chat-header/customer-chat-header.component';
import { CustomerMessageTimelineComponent } from '@/site-management/customer/chat/components/customer-message-timeline/customer-message-timeline.component';
import { CustomerSharedContentSidebarComponent } from '@/site-management/customer/chat/components/customer-shared-content-sidebar/customer-shared-content-sidebar.component';
import { CustomerChatSearchSidebarComponent } from '@/site-management/customer/chat/components/customer-chat-search-sidebar/customer-chat-search-sidebar.component';
import { CustomerUploadQueueComponent } from '@/site-management/customer/chat/components/customer-upload-queue/customer-upload-queue.component';
import { CustomerChatSharedItem } from '@/site-management/shared/chat/data-access/models/customer-chat.models';
import { CustomerChatEventType } from '@/site-management/shared/chat/data-access/models/customer-chat.event';
import { CustomerChatStore } from '@/site-management/customer/chat/data-access/store/customer-chat.store';
import { ConfirmService } from '@/shared/components/confirm/confirm.service';
import { firstValueFrom } from 'rxjs';
import { toCustomerTicketBanner } from '@/site-management/customer/chat/components/customer-ticket-banner.viewmodel';

@Component({
  selector: 'app-customer-chat-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    SiteHeaderContainerComponent,
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
  protected readonly ticketBanner = computed(() =>
    toCustomerTicketBanner(this.store.activeTicketStatusToShow()),
  );

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

  protected async confirmDelete(id?: string): Promise<void> {
    const confirmed = await firstValueFrom(
      this.confirmService.open({
        title: 'Xóa hội thoại',
        content: 'Bạn có chắc chắn muốn xóa vĩnh viễn cuộc hội thoại này không?',
      }),
    );

    if (confirmed) {
      this.store.deleteConversation(id);
    }
  }
}
