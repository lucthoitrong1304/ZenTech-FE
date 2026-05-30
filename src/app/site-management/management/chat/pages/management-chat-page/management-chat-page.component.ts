import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CallSignalingService } from '../../../../../core/services/call-signaling.service';
import { MediaPreviewDialogComponent } from '../../../../../shared/components/media-preview-dialog/media-preview-dialog.component';
import { MediaPreviewItem } from '../../../../../shared/components/media-preview-dialog/media-preview-dialog.model';
import { ChatComposerComponent } from '../../components/chat-composer/chat-composer.component';
import { ChatEmptyStateComponent } from '../../components/chat-empty-state/chat-empty-state.component';
import { ChatFilterSidebarComponent } from '../../components/chat-filter-sidebar/chat-filter-sidebar.component';
import { ChatHeaderComponent } from '../../components/chat-header/chat-header.component';
import { ChatMediaDrawerComponent } from '../../components/chat-media-drawer/chat-media-drawer.component';
import { ConversationListComponent } from '../../components/conversation-list/conversation-list.component';
import { MessageTimelineComponent } from '../../components/message-timeline/message-timeline.component';
import { ManagementChatStore } from '../../data-access/store/management-chat.store';
import { ManagementShellUiState } from '../../../data-access/state/management-shell-ui.state';

@Component({
  selector: 'app-management-chat-page',
  standalone: true,
  imports: [
    CommonModule,
    ChatComposerComponent,
    ChatEmptyStateComponent,
    ChatFilterSidebarComponent,
    ChatHeaderComponent,
    ChatMediaDrawerComponent,
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
  protected readonly previewItem = signal<MediaPreviewItem | null>(null);

  ngOnInit(): void {
    this.store.loadWorkspace();

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
}
