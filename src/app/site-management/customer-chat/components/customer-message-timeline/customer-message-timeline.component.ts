import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';
import { LucideBot, LucideFileText, LucideImage, LucideUserRound, LucidePhone } from '@lucide/angular';
import { MarkdownComponent } from 'ngx-markdown';
import { MediaPreviewItem } from '../../../../shared/components/media-preview-dialog/media-preview-dialog.model';
import { ChatProductRecommendationsComponent } from '../../../../shared/components/chat-product-recommendations/chat-product-recommendations.component';
import {
  CustomerChatMessageAttachment,
  CustomerChatMessage,
  CustomerChatParticipant,
} from '../../data-access/models/customer-chat.models';

@Component({
  selector: 'app-customer-message-timeline',
  standalone: true,
  imports: [CommonModule, LucideBot, LucideFileText, LucideImage, LucideUserRound, LucidePhone, MarkdownComponent, ChatProductRecommendationsComponent],
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

    :host ::ng-deep .customer-ai-markdown {
      color: #1f2937;
      font-size: 0.925rem;
      line-height: 1.65;
    }

    :host ::ng-deep .customer-ai-markdown p {
      margin: 0 0 0.625rem;
    }

    :host ::ng-deep .customer-ai-markdown p:last-child {
      margin-bottom: 0;
    }

    :host ::ng-deep .customer-ai-markdown ul,
    :host ::ng-deep .customer-ai-markdown ol {
      margin: 0.35rem 0 0.85rem;
      padding-left: 1.15rem;
    }

    :host ::ng-deep .customer-ai-markdown ul {
      list-style: none;
      padding-left: 0;
    }

    :host ::ng-deep .customer-ai-markdown ul li {
      position: relative;
      padding-left: 1.1rem;
    }

    :host ::ng-deep .customer-ai-markdown ul li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.72em;
      width: 0.35rem;
      height: 0.35rem;
      border-radius: 999px;
      background: #ffc700;
      box-shadow: 0 0 0 2px rgba(255, 199, 0, 0.2);
    }

    :host ::ng-deep .customer-ai-markdown li + li {
      margin-top: 0.38rem;
    }

    :host ::ng-deep .customer-ai-markdown strong {
      color: #111827;
      font-weight: 750;
    }

    :host ::ng-deep .customer-ai-markdown code {
      border-radius: 0.25rem;
      background: rgba(255, 199, 0, 0.16);
      padding: 0.1rem 0.3rem;
      color: #6b4d00;
      font-size: 0.92em;
    }
  `],
  host: {
    class: 'flex min-h-0 flex-1 flex-col',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerMessageTimelineComponent {
  readonly messages = input.required<CustomerChatMessage[]>();
  readonly customer = input<CustomerChatParticipant | null>(null);
  readonly staff = input<CustomerChatParticipant | null>(null);
  readonly compact = input(false);
  readonly highlightedMessageId = input<string | null>(null);
  readonly previewRequested = output<MediaPreviewItem>();
  readonly highlightCleared = output<void>();

  constructor() {
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
