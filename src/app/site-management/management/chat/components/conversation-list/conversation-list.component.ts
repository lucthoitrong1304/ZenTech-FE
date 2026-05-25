import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideSearch } from '@lucide/angular';
import { ManagementChatConversation } from '../../data-access/models/management-chat.models';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [CommonModule, LucideSearch],
  templateUrl: './conversation-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversationListComponent {
  readonly conversations = input.required<ManagementChatConversation[]>();
  readonly selectedConversationId = input.required<string | null>();
  readonly searchKeyword = input.required<string>();

  readonly searchKeywordChanged = output<string>();
  readonly conversationSelected = output<string>();

  protected onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchKeywordChanged.emit(target.value);
  }
}
