import { CommonModule } from '@angular/common';
import { Component, OnInit, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import {
  LucideExternalLink,
  LucideFileText,
  LucideImage,
  LucideLink,
  LucideMessageCircle,
  LucideMoreVertical,
  LucidePhone,
  LucidePlus,
  LucideSearch,
  LucideVideo,
} from '@lucide/angular';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { CategoryNavigationStore } from '../../../shared/data-access/store/category-navigation.store';
import { SiteHeaderComponent } from '../../../shared/site-header/site-header.component';
import { CustomerChatComposerComponent } from '../../components/customer-chat-composer/customer-chat-composer.component';
import { CustomerChatHeaderComponent } from '../../components/customer-chat-header/customer-chat-header.component';
import { CustomerMessageTimelineComponent } from '../../components/customer-message-timeline/customer-message-timeline.component';
import { CustomerSharedContentSidebarComponent } from '../../components/customer-shared-content-sidebar/customer-shared-content-sidebar.component';
import { CustomerUploadQueueComponent } from '../../components/customer-upload-queue/customer-upload-queue.component';
import { CustomerChatStore } from '../../data-access/store/customer-chat.store';

@Component({
  selector: 'app-customer-chat-page',
  standalone: true,
  imports: [
    CommonModule,
    SiteHeaderComponent,
    CustomerChatComposerComponent,
    CustomerChatHeaderComponent,
    CustomerMessageTimelineComponent,
    CustomerSharedContentSidebarComponent,
    CustomerUploadQueueComponent,
    LucideExternalLink,
    LucideFileText,
    LucideImage,
    LucideLink,
    LucideMessageCircle,
    LucideMoreVertical,
    LucidePhone,
    LucidePlus,
    LucideSearch,
    LucideVideo,
  ],
  templateUrl: './customer-chat-page.component.html',
  styleUrl: './customer-chat-page.component.css',
})
export class CustomerChatPageComponent implements OnInit {
  private readonly authSessionStore = inject(AuthSessionStore);
  private readonly categoryNavigationStore = inject(CategoryNavigationStore);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  protected readonly store = inject(CustomerChatStore);

  protected readonly navItems = this.categoryNavigationStore.navItems;
  protected readonly currentUser = this.authSessionStore.currentUser;

  constructor() {
    effect(() => {
      const message = this.authSessionStore.logoutSuccessMessage();

      if (message) {
        untracked(() => {
          this.toastService.success(message);
          this.authSessionStore.clearLogoutMessages();
          this.router.navigate(['/']);
        });
      }
    });

    effect(() => {
      const message = this.authSessionStore.logoutWarningMessage();

      if (message) {
        untracked(() => {
          this.toastService.warning(message);
          this.authSessionStore.clearLogoutMessages();
          this.router.navigate(['/']);
        });
      }
    });
  }

  ngOnInit(): void {
    this.store.openFullChat();

    if (!this.store.session()) {
      this.store.loadSession();
    }
  }

  protected onLogout(): void {
    this.authSessionStore.logout();
  }
}
