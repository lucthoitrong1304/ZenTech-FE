import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ChatComposerComponent } from '../../components/chat-composer/chat-composer.component';
import { ChatEmptyStateComponent } from '../../components/chat-empty-state/chat-empty-state.component';
import { ChatFilterSidebarComponent } from '../../components/chat-filter-sidebar/chat-filter-sidebar.component';
import { ChatHeaderComponent } from '../../components/chat-header/chat-header.component';
import { ChatMediaDrawerComponent } from '../../components/chat-media-drawer/chat-media-drawer.component';
import { ConversationListComponent } from '../../components/conversation-list/conversation-list.component';
import { MessageTimelineComponent } from '../../components/message-timeline/message-timeline.component';
import { OwnerChatStore } from '../../data-access/store/owner-chat.store';
import { OwnerShellUiState } from '../../../data-access/state/owner-shell-ui.state';

@Component({
  selector: 'app-owner-chat-page',
  standalone: true,
  imports: [
    CommonModule,
    ChatComposerComponent,
    ChatEmptyStateComponent,
    ChatFilterSidebarComponent,
    ChatHeaderComponent,
    ChatMediaDrawerComponent,
    ConversationListComponent,
    MessageTimelineComponent,
  ],
  providers: [OwnerChatStore],
  templateUrl: './owner-chat-page.component.html',
  styleUrl: './owner-chat-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnerChatPageComponent implements OnInit {
  protected readonly store = inject(OwnerChatStore);
  protected readonly ownerShellUi = inject(OwnerShellUiState);

  ngOnInit(): void {
    this.store.loadWorkspace();
  }

  protected showAdminSidebar(): void {
    this.ownerShellUi.showAdminSidebar();
  }
}
