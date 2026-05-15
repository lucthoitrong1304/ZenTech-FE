import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CustomerChatComposerComponent } from '../customer-chat-composer/customer-chat-composer.component';
import { CustomerChatHeaderComponent } from '../customer-chat-header/customer-chat-header.component';
import { CustomerChatLauncherComponent } from '../customer-chat-launcher/customer-chat-launcher.component';
import { CustomerMessageTimelineComponent } from '../customer-message-timeline/customer-message-timeline.component';
import { CustomerSharedContentSidebarComponent } from '../customer-shared-content-sidebar/customer-shared-content-sidebar.component';
import { CustomerUploadQueueComponent } from '../customer-upload-queue/customer-upload-queue.component';
import { CustomerChatStore } from '../../data-access/store/customer-chat.store';

@Component({
  selector: 'app-customer-chat-popup',
  standalone: true,
  imports: [
    CommonModule,
    CustomerChatComposerComponent,
    CustomerChatHeaderComponent,
    CustomerChatLauncherComponent,
    CustomerMessageTimelineComponent,
    CustomerSharedContentSidebarComponent,
    CustomerUploadQueueComponent,
  ],
  templateUrl: './customer-chat-popup.component.html',
  styleUrl: './customer-chat-popup.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerChatPopupComponent implements OnInit {
  protected readonly store = inject(CustomerChatStore);

  ngOnInit(): void {
    if (!this.store.session()) {
      this.store.loadSession();
    }
  }
}
