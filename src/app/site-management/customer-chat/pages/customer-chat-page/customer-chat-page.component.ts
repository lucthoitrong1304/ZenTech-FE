import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, OnInit, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import {
  LucideExternalLink,
  LucideFileText,
  LucideImage,
  LucideLink,
  LucideMessageCircle,
  LucideMoreVertical,
  LucidePhone,
  LucidePlus,
  LucideSearch,
  LucideVideo,
} from '@lucide/angular';
import { MediaPreviewDialogComponent } from '../../../../shared/components/media-preview-dialog/media-preview-dialog.component';
import { MediaPreviewItem } from '../../../../shared/components/media-preview-dialog/media-preview-dialog.model';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { CallSignalingService } from '../../../../core/services/call-signaling.service';
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
    LucidePhone,
    LucidePlus,
    LucideSearch,
    LucideVideo,
  ],
  templateUrl: './customer-chat-page.component.html',
  styleUrl: './customer-chat-page.component.css',
})
export class CustomerChatPageComponent implements OnInit {
  private readonly authSessionStore = inject(AuthSessionStore);
  private readonly categoryNavigationStore = inject(CategoryNavigationStore);
  private readonly callSignalingService = inject(CallSignalingService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  protected readonly cartStore = inject(CartStore);
  protected readonly store = inject(CustomerChatStore);

  protected readonly navItems = this.categoryNavigationStore.navItems;
  protected readonly currentUser = this.authSessionStore.currentUser;
  protected readonly previewItem = signal<MediaPreviewItem | null>(null);

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

    this.callSignalingService.callEnded.subscribe(
      ({ durationStr, status, isCaller }) => {
        if (isCaller) {
          this.store.sendCallMessage({ duration: durationStr, status });
        }
      }
    );
  }

  protected openSearch(): void {
    this.store.dispatch({ type: CustomerChatEventType.SearchRequested });
  }

  protected onLogout(): void {
    this.authSessionStore.logout();
  }

  protected startStaffCall(): void {
    const staffEmail = this.store.staff()?.email?.trim();
    const sessionStatus = this.store.session()?.status;

    if (sessionStatus !== 'AGENT_HANDLING') {
      console.warn(
        '[WebRTC] Cannot call staff because the active conversation is not handled by staff.',
        sessionStatus
      );
      return;
    }

    if (!staffEmail) {
      console.warn('[WebRTC] Cannot call staff because the active staff email is missing.');
      return;
    }

    this.callSignalingService.initiateCall(staffEmail);
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
      ? 'B\u1ea1n c\u00f3 th\u1ec3 th\u1eed l\u1ea1i thao t\u00e1c v\u1eeba g\u1eb7p l\u1ed7i. N\u1ebfu v\u1eabn ch\u01b0a \u1ed5n, h\u00e3y nh\u1eafn v\u1edbi nh\u00e2n vi\u00ean h\u1ed7 tr\u1ee3.'
      : 'T\u1ee5i m\u00ecnh \u0111ang ki\u1ec3m tra v\u00e0 s\u1ebd c\u1eadp nh\u1eadt khi c\u00f3 k\u1ebft qu\u1ea3. B\u1ea1n v\u1eabn c\u00f3 th\u1ec3 nh\u1eafn th\u00eam th\u00f4ng tin n\u1ebfu c\u1ea7n.';
  }
}
