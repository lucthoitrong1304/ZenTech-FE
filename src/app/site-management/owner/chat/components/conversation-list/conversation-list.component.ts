import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideSearch } from '@lucide/angular';
import { OwnerChatConversation } from '../../data-access/models/owner-chat.models';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [CommonModule, LucideSearch],
  templateUrl: './conversation-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversationListComponent {
  readonly conversations = input.required<OwnerChatConversation[]>();
  readonly selectedConversationId = input.required<string | null>();
  readonly searchKeyword = input.required<string>();

  readonly searchKeywordChanged = output<string>();
  readonly conversationSelected = output<string>();

  protected onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchKeywordChanged.emit(target.value);
  }
}
