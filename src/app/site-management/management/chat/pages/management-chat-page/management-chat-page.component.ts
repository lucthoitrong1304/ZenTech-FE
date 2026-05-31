import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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

import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';

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
export class ManagementChatPageComponent implements OnInit {
  private readonly callSignalingService = inject(CallSignalingService);
  protected readonly store = inject(ManagementChatStore);
  protected readonly managementShellUi = inject(ManagementShellUiState);
  private readonly route = inject(ActivatedRoute);
  protected readonly previewItem = signal<MediaPreviewItem | null>(null);
  protected readonly transferDialogOpen = signal(false);
  protected readonly selectedStaffId = signal<string | null>(null);

  ngOnInit(): void {
    this.store.loadWorkspace();

    this.route.queryParams.subscribe(params => {
      const conversationId = params['conversationId'];
      if (conversationId) {
        this.store.selectConversation(conversationId);
      }
    });

    this.callSignalingService.callEnded.subscribe(
      ({ durationStr, status, isCaller }) => {
        if (isCaller) {
          this.store.sendCallMessage({ duration: durationStr, status });
        }
      }
    );
  }

  protected showAdminSidebar(): void {
    this.managementShellUi.showAdminSidebar();
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
