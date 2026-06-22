import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CallSignalingService } from '../../../../../core/services/call-signaling.service';
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

import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

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
  ],
  providers: [ManagementChatStore],
  templateUrl: './management-chat-page.component.html',
  styleUrl: './management-chat-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagementChatPageComponent implements OnInit, OnDestroy {
  private readonly callSignalingService = inject(CallSignalingService);
  protected readonly store = inject(ManagementChatStore);
  protected readonly managementShellUi = inject(ManagementShellUiState);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ticketService = inject(ManagementTicketService);
  private readonly websocketService = inject(WebsocketService);
  protected readonly previewItem = signal<MediaPreviewItem | null>(null);
  protected readonly transferDialogOpen = signal(false);
  protected readonly selectedStaffId = signal<string | null>(null);
  protected readonly relatedTickets = signal<ManagementTicket[]>([]);
  protected readonly ticketsLoading = signal(false);
  private ticketRefreshSub: Subscription | null = null;

  constructor() {
    effect(() => {
      const email = this.store.selectedConversation()?.customer.email || '';
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

    this.callSignalingService.callEnded.subscribe(
      ({ durationStr, status, isCaller }) => {
        if (isCaller) {
          this.store.sendCallMessage({ duration: durationStr, status });
        }
      }
    );
  }


  ngOnDestroy(): void {
    this.ticketRefreshSub?.unsubscribe();
    this.ticketRefreshSub = null;
  }

  protected latestRelatedTicket(): ManagementTicket | null {
    return this.primaryRelatedTicket();
  }

  protected primaryRelatedTicket(): ManagementTicket | null {
    return this.relatedTickets().find(ticket => this.isTicketActive(ticket)) || this.relatedTickets()[0] || null;
  }

  protected extraRelatedTicketCount(): number {
    return Math.max(this.relatedTickets().length - (this.primaryRelatedTicket() ? 1 : 0), 0);
  }

  protected resolvedRelatedTicketCount(): number {
    const primary = this.primaryRelatedTicket();
    return this.relatedTickets().filter(ticket => ticket !== primary && !this.isTicketActive(ticket)).length;
  }

  protected otherActiveRelatedTicketCount(): number {
    const primary = this.primaryRelatedTicket();
    return this.relatedTickets().filter(ticket => ticket !== primary && this.isTicketActive(ticket)).length;
  }

  protected openCustomerTickets(email: string | null): void {
    if (!email) {
      return;
    }
    this.router.navigate(['/management/tickets'], { queryParams: { customerEmail: email } });
  }

  protected openTicketDetail(ticket: ManagementTicket, email: string | null): void {
    this.router.navigate(['/management/tickets'], {
      queryParams: {
        customerEmail: email || null,
        ticketId: ticket.id,
      },
    });
  }

  protected isTicketActive(ticket: ManagementTicket): boolean {
    return ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS';
  }

  protected ticketStatusLabel(ticket: ManagementTicket): string {
    if (ticket.status === 'OPEN') return '\u0110ang m\u1edf';
    if (ticket.status === 'IN_PROGRESS') return '\u0110ang x\u1eed l\u00fd';
    if (ticket.status === 'RESOLVED') return '\u0110\u00e3 x\u1eed l\u00fd';
    return '\u0110\u00e3 \u0111\u00f3ng';
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

  protected startCustomerCall(targetEmail: string | null): void {
    if (!targetEmail) {
      return;
    }

    this.callSignalingService.initiateCall(targetEmail);
  }

  protected closePreview(): void {
    this.previewItem.set(null);
  }

  protected openTransferDialog(): void {
    this.store.loadActiveStaffList();
    this.transferDialogOpen.set(true);
    this.selectedStaffId.set(null);
  }

  protected submitTransfer(): void {
    if (this.selectedStaffId()) {
      this.store.transferConversation(this.selectedStaffId());
      this.transferDialogOpen.set(false);
    }
  }
}


