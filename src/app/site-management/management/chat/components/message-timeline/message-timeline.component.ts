import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, effect, input, output, signal, viewChild } from '@angular/core';
import { LucideArrowDown, LucideBot, LucideFileText, LucideImage } from '@lucide/angular';
import { MarkdownComponent } from 'ngx-markdown';
import { MediaPreviewItem } from '@/shared/components/media-preview-dialog/media-preview-dialog.model';
import { ChatProductRecommendationsComponent } from '@/shared/components/chat-product-recommendations/chat-product-recommendations.component';
import {
  ManagementChatConversation,
  ManagementChatMessageAttachment,
  ManagementChatMessage,
} from '@/site-management/management/chat/data-access/models/management-chat.models';

@Component({
  selector: 'app-message-timeline',
  standalone: true,
  imports: [CommonModule, LucideArrowDown, LucideBot, LucideFileText, LucideImage, MarkdownComponent, ChatProductRecommendationsComponent],
  templateUrl: './message-timeline.component.html',
  host: {
    class: 'flex min-h-0 flex-1 flex-col',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageTimelineComponent {
  readonly conversation = input.required<ManagementChatConversation>();
  readonly messages = input.required<ManagementChatMessage[]>();
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

  constructor() {
    effect(() => {
      const conversationId = this.conversation().id;
      const count = this.messages().length;
      const conversationChanged = conversationId !== this.previousConversationId;
      this.previousConversationId = conversationId;
      const added = Math.max(count - this.previousMessageCount, 0);
      this.previousMessageCount = count;
      setTimeout(() => {
        const container = this.scrollContainer()?.nativeElement;
        if (!container) return;
        if (conversationChanged) {
          this.atBottom = true;
          this.pendingNewMessages.set(0);
          this.showJumpToLatest.set(false);
          container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
          return;
        }
        if (this.atBottom) {
          container.scrollTo({ top: container.scrollHeight, behavior: added ? 'smooth' : 'auto' });
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
        setTimeout(() => {
          const el = document.getElementById(`msg-${id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
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

  protected isPreviewable(attachment: ManagementChatMessageAttachment): boolean {
    return attachment.type === 'IMAGE' || attachment.type === 'VIDEO';
  }

  protected requestPreview(attachment: ManagementChatMessageAttachment): void {
    if (!this.isPreviewable(attachment)) {
      return;
    }

    this.previewRequested.emit({
      type: attachment.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      title: attachment.title,
      url: attachment.url,
    });
  }

  protected failedImages = new Set<string>();

  protected onImageError(id: string): void {
    this.failedImages.add(id);
  }

  protected isImageFailed(id: string): boolean {
    return this.failedImages.has(id);
  }
}
