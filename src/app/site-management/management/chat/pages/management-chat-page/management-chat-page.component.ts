import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MediaPreviewDialogComponent } from '../../../../../shared/components/media-preview-dialog/media-preview-dialog.component';
import { MediaPreviewItem } from '../../../../../shared/components/media-preview-dialog/media-preview-dialog.model';
import { ChatComposerComponent } from '../../components/chat-composer/chat-composer.component';
import { ChatEmptyStateComponent } from '../../components/chat-empty-state/chat-empty-state.component';
import { ChatFilterSidebarComponent } from '../../components/chat-filter-sidebar/chat-filter-sidebar.component';
import { ChatHeaderComponent } from '../../components/chat-header/chat-header.component';
import { ChatMediaDrawerComponent } from '../../components/chat-media-drawer/chat-media-drawer.component';
import { ChatSearchSidebarComponent } from '../../components/chat-search-sidebar/chat-search-sidebar.component';
import { ConversationListComponent } from '../../components/conversation-list/conversation-list.component';
import { MessageTimelineComponent } from '../../components/message-timeline/message-timeline.component';
import { ManagementChatStore } from '../../data-access/store/management-chat.store';
import { ManagementShellUiState } from '../../../data-access/state/management-shell-ui.state';
import { WebsocketService } from '../../../../../core/services/websocket.service';
import { ManagementTicket } from '../../../tickets/data-access/models/management-ticket.models';
import { ManagementTicketService } from '../../../tickets/data-access/services/management-ticket.service';
import { LucideX } from '@lucide/angular';

import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PermissionService } from '../../../../../core/permissions/permission.service';
import { PermissionCode } from '../../../../../core/permissions/permission.models';

@Component({
  selector: 'app-management-chat-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ChatComposerComponent,
    ChatEmptyStateComponent,
    ChatFilterSidebarComponent,
    ChatHeaderComponent,
    ChatMediaDrawerComponent,
    ChatSearchSidebarComponent,
    ConversationListComponent,
    MediaPreviewDialogComponent,
    MessageTimelineComponent,
    LucideX,
  ],
  providers: [ManagementChatStore],
  templateUrl: './management-chat-page.component.html',
  styleUrl: './management-chat-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagementChatPageComponent implements OnInit, OnDestroy {
  protected readonly store = inject(ManagementChatStore);
  protected readonly managementShellUi = inject(ManagementShellUiState);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ticketService = inject(ManagementTicketService);
  private readonly websocketService = inject(WebsocketService);
  private readonly permissionService = inject(PermissionService);
  protected readonly canUpdateChat = computed(() => this.permissionService.has(PermissionCode.CHAT_UPDATE));
  protected readonly previewItem = signal<MediaPreviewItem | null>(null);
  protected readonly transferDialogOpen = signal(false);
  protected readonly selectedStaffId = signal<string | null>(null);
  protected readonly relatedTickets = signal<ManagementTicket[]>([]);
  protected readonly ticketsLoading = signal(false);
  protected readonly dismissedTicketCode = signal<string | null>(null);
  protected readonly dismissedTicketStatus = signal<string | null>(null);
  private ticketRefreshSub: Subscription | null = null;

  protected readonly activeRelatedTicket = computed(() => {
    const tickets = this.relatedTickets();
    const active = tickets.find(ticket => this.isTicketActive(ticket)) || tickets[0] || null;
    if (!active) {
      return null;
    }
    if (active.code === this.dismissedTicketCode() && active.status === this.dismissedTicketStatus()) {
      return null;
    }
    return active;
  });

  constructor() {
    effect(() => {
      const email = this.store.selectedConversation()?.customer.email || '';
      untracked(() => {
        this.dismissedTicketCode.set(null);
        this.dismissedTicketStatus.set(null);
      });
      this.loadRelatedTickets(email);
    });
  }

  ngOnInit(): void {
    this.store.loadWorkspace();

    this.route.queryParams.subscribe(params => {
      const conversationId = params['conversationId'];
      if (conversationId) {
        this.store.selectConversation(conversationId);
      }
    });

    this.websocketService.connect();
    this.ticketRefreshSub = this.websocketService.subscribe('/topic/admin.tickets').subscribe(() => {
      const email = this.store.selectedConversation()?.customer.email || '';
      this.loadRelatedTickets(email);
    });

  }


  ngOnDestroy(): void {
    this.ticketRefreshSub?.unsubscribe();
    this.ticketRefreshSub = null;
  }

  protected latestRelatedTicket(): ManagementTicket | null {
    return this.activeRelatedTicket();
  }

  protected primaryRelatedTicket(): ManagementTicket | null {
    return this.activeRelatedTicket();
  }

  protected extraRelatedTicketCount(): number {
    const primary = this.activeRelatedTicket();
    return Math.max(this.relatedTickets().length - (primary ? 1 : 0), 0);
  }

  protected resolvedRelatedTicketCount(): number {
    const primary = this.activeRelatedTicket();
    return this.relatedTickets().filter(ticket => ticket !== primary && !this.isTicketActive(ticket)).length;
  }

  protected otherActiveRelatedTicketCount(): number {
    const primary = this.activeRelatedTicket();
    return this.relatedTickets().filter(ticket => ticket !== primary && this.isTicketActive(ticket)).length;
  }

  protected openCustomerTickets(email: string | null): void {
    if (!email) {
      return;
    }
    this.router.navigate(['/management/tickets'], { queryParams: { customerEmail: email } });
  }

  protected openTicketDetail(ticket: ManagementTicket, email: string | null): void {
    if (ticket.code.startsWith('INC-')) {
      this.router.navigate(['/admin/incidents', ticket.id]);
      return;
    }
    this.router.navigate(['/management/tickets'], {
      queryParams: {
        customerEmail: email || null,
        ticketId: ticket.id,
      },
    });
  }

  protected dismissTicket(ticketCode: string, status: string): void {
    this.dismissedTicketCode.set(ticketCode);
    this.dismissedTicketStatus.set(status);
  }

  protected isTicketActive(ticket: ManagementTicket): boolean {
    return ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS';
  }

  protected ticketStatusLabel(ticket: ManagementTicket): string {
    if (ticket.status === 'OPEN') return 'Đang mở';
    if (ticket.status === 'IN_PROGRESS') return 'Đang xử lý';
    if (ticket.status === 'RESOLVED') return 'Đã xử lý';
    return 'Đã đóng';
  }

  private loadRelatedTickets(email: string): void {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      this.relatedTickets.set([]);
      this.ticketsLoading.set(false);
      return;
    }

    this.ticketsLoading.set(true);
    this.ticketService.getTicketsForCustomer(normalizedEmail, 4).subscribe({
      next: page => {
        this.relatedTickets.set(page.content || []);
        this.ticketsLoading.set(false);
      },
      error: () => {
        this.relatedTickets.set([]);
        this.ticketsLoading.set(false);
      },
    });
  }
  protected showAdminSidebar(): void {
    this.managementShellUi.showAdminSidebar();
    this.router.navigate(['/management/dashboard']);
  }

  protected openPreview(item: MediaPreviewItem): void {
    this.previewItem.set(item);
  }

  protected closePreview(): void {
    this.previewItem.set(null);
  }

  protected openTransferDialog(): void {
    if (!this.canUpdateChat()) {
      return;
    }

    this.store.loadActiveStaffList();
    this.transferDialogOpen.set(true);
    this.selectedStaffId.set(null);
  }

  protected submitTransfer(): void {
    if (!this.canUpdateChat()) {
      return;
    }

    if (this.selectedStaffId()) {
      this.store.transferConversation(this.selectedStaffId());
      this.transferDialogOpen.set(false);
    }
  }

  protected getFriendlyTicketTitle(title: string | null | undefined): string {
    if (!title) return 'Yêu cầu xử lý kỹ thuật';
    
    let friendly = title;
    
    if (friendly.includes('Cannot create MoMo payment') || friendly.includes('momo')) {
      friendly = friendly.replace(/Cannot create MoMo payment/i, 'Không thể khởi tạo thanh toán qua ví MoMo');
    }
    if (friendly.includes('checkout') || friendly.includes('Cannot checkout')) {
      friendly = friendly.replace(/Cannot checkout/i, 'Lỗi tiến trình đặt hàng & thanh toán (Checkout)');
    }
    if (friendly.includes('login') || friendly.includes('auth')) {
      friendly = friendly.replace(/login/i, 'Đăng nhập hệ thống').replace(/auth/i, 'Xác thực tài khoản');
    }
    
    friendly = friendly.replace(/^Sửa lỗi sự cố/i, 'Khắc phục lỗi');
    
    return friendly;
  }
}
