import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { LucideArrowDown, LucideBot, LucideFileText, LucideImage, LucideUserRound } from '@lucide/angular';
import { MarkdownComponent } from 'ngx-markdown';
import { MediaPreviewItem } from '@/shared/components/media-preview-dialog/media-preview-dialog.model';
import { ChatProductRecommendationsComponent } from '@/shared/components/chat-product-recommendations/chat-product-recommendations.component';
import {
  CustomerChatMessageAttachment,
  CustomerChatMessage,
  CustomerChatParticipant,
} from '@/site-management/shared/chat/data-access/models/customer-chat.models';

@Component({
  selector: 'app-customer-message-timeline',
  standalone: true,
  imports: [CommonModule, LucideArrowDown, LucideBot, LucideFileText, LucideImage, LucideUserRound, MarkdownComponent, ChatProductRecommendationsComponent],
  templateUrl: './customer-message-timeline.component.html',
  styles: [`
    :host .ai-message > div > div:last-child {
      position: relative;
      overflow: hidden;
    }

    :host .ai-message > div > div:last-child::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: 3px;
      background: #ffc700;
    }

  `],
  host: {
    class: 'flex min-h-0 flex-1 flex-col',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerMessageTimelineComponent {
  readonly messages = input.required<CustomerChatMessage[]>();
  readonly conversationId = input<string | null>(null);
  readonly customer = input<CustomerChatParticipant | null>(null);
  readonly staff = input<CustomerChatParticipant | null>(null);
  readonly compact = input(false);
  readonly aiResponding = input(false);
  readonly highlightedMessageId = input<string | null>(null);
  readonly previewRequested = output<MediaPreviewItem>();
  readonly highlightCleared = output<void>();
  readonly bottomReached = output<void>();
  private readonly scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');
  protected readonly pendingNewMessages = signal(0);
  protected readonly showJumpToLatest = signal(false);
  private atBottom = true;
  private previousMessageCount = 0;
  private previousConversationId: string | null = null;
  private pendingConversationSelectionId: string | null = null;
  protected readonly showAiTyping = computed(
    () => this.aiResponding() && !this.messages().some((message) => message.id === 'ai-streaming')
  );

  constructor() {
    effect(() => {
      const conversationId = this.conversationId();
      const count = this.messages().length;
      const conversationChanged = conversationId !== this.previousConversationId;
      this.previousConversationId = conversationId;
      if (conversationChanged) {
        this.pendingConversationSelectionId = conversationId;
      }
      const added = Math.max(count - this.previousMessageCount, 0);
      this.previousMessageCount = count;
      setTimeout(() => {
        const container = this.scrollContainer()?.nativeElement;
        if (!container) return;
        const isRenderingSelectedConversation =
          conversationChanged || this.pendingConversationSelectionId === conversationId;
        if (isRenderingSelectedConversation) {
          this.atBottom = true;
          this.pendingNewMessages.set(0);
          this.showJumpToLatest.set(false);
          container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
          setTimeout(() => {
            if (this.pendingConversationSelectionId === conversationId) {
              this.pendingConversationSelectionId = null;
            }
          });
          return;
        }
        if (this.atBottom) {
          container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
          this.pendingNewMessages.set(0);
          this.showJumpToLatest.set(false);
          if (added) this.bottomReached.emit();
        } else if (added) {
          this.pendingNewMessages.update(value => value + added);
          this.showJumpToLatest.set(true);
        }
      });
    });
    effect(() => {
      const id = this.highlightedMessageId();
      if (id) {
        // Wait for rendering then scroll
        setTimeout(() => {
          const el = document.getElementById(`msg-${id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add a temporary highlight class
            el.classList.add('bg-yellow-100/50', 'transition-colors', 'duration-1000');
            
            setTimeout(() => {
              el.classList.remove('bg-yellow-100/50', 'transition-colors', 'duration-1000');
              this.highlightCleared.emit();
            }, 3000);
          }
        }, 100);
      }
    });
  }

  protected onScroll(event: Event): void {
    const container = event.currentTarget as HTMLElement;
    this.atBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 48;
    this.showJumpToLatest.set(!this.atBottom);
    if (this.atBottom && this.pendingNewMessages() > 0) {
      this.pendingNewMessages.set(0);
      this.bottomReached.emit();
    }
  }

  protected scrollToLatest(): void {
    const container = this.scrollContainer()?.nativeElement;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    this.atBottom = true;
    this.pendingNewMessages.set(0);
    this.showJumpToLatest.set(false);
    this.bottomReached.emit();
  }

  protected isPreviewable(attachment: CustomerChatMessageAttachment): boolean {
    return attachment.type === 'IMAGE' || attachment.type === 'VIDEO';
  }

  protected requestPreview(attachment: CustomerChatMessageAttachment): void {
    if (!this.isPreviewable(attachment)) {
      return;
    }

    this.previewRequested.emit({
      type: attachment.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      title: attachment.title,
      url: attachment.url,
    });
  }
}
