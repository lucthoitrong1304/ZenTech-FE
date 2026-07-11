import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideAlertTriangle, LucideCheckCircle, LucideLogIn, LucideMessageCircle, LucideWrench, LucideX } from '@lucide/angular';
import { filter, map } from 'rxjs';
import { MediaPreviewDialogComponent } from '@/shared/components/media-preview-dialog/media-preview-dialog.component';
import { MediaPreviewItem } from '@/shared/components/media-preview-dialog/media-preview-dialog.model';
import { CustomerChatComposerComponent } from '@/site-management/customer/chat/components/customer-chat-composer/customer-chat-composer.component';
import { CustomerChatHeaderComponent } from '@/site-management/customer/chat/components/customer-chat-header/customer-chat-header.component';
import { CustomerChatLauncherComponent } from '@/site-management/customer/chat/components/customer-chat-launcher/customer-chat-launcher.component';
import { CustomerMessageTimelineComponent } from '@/site-management/customer/chat/components/customer-message-timeline/customer-message-timeline.component';
import { CustomerSharedContentSidebarComponent } from '@/site-management/customer/chat/components/customer-shared-content-sidebar/customer-shared-content-sidebar.component';
import { CustomerUploadQueueComponent } from '@/site-management/customer/chat/components/customer-upload-queue/customer-upload-queue.component';
import { CustomerChatStore } from '@/site-management/customer/chat/data-access/store/customer-chat.store';
import { toCustomerTicketBanner } from '@/site-management/customer/chat/components/customer-ticket-banner.viewmodel';

@Component({
  selector: 'app-customer-chat-popup',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CustomerChatComposerComponent,
    CustomerChatHeaderComponent,
    CustomerChatLauncherComponent,
    CustomerMessageTimelineComponent,
    CustomerSharedContentSidebarComponent,
    CustomerUploadQueueComponent,
    MediaPreviewDialogComponent,
    LucideLogIn,
    LucideMessageCircle,
    LucideX,
    LucideAlertTriangle,
    LucideWrench,
    LucideCheckCircle,
  ],
  templateUrl: './customer-chat-popup.component.html',
  styleUrl: './customer-chat-popup.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerChatPopupComponent {
  private readonly router = inject(Router);
  protected readonly store = inject(CustomerChatStore);
  protected readonly previewItem = signal<MediaPreviewItem | null>(null);
  protected readonly ticketBanner = computed(() => toCustomerTicketBanner(this.store.activeTicketStatusToShow()));
  protected readonly loginQueryParams = computed(() => ({ returnUrl: this.router.url || '/' }));
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  constructor() {
    if (!this.store.session()) {
      this.store.loadSession();
    }

    effect(() => this.updateRouteContext(this.currentUrl()), { allowSignalWrites: true });
  }

  protected openPreview(item: MediaPreviewItem): void {
    this.previewItem.set(item);
  }

  protected closePreview(): void {
    this.previewItem.set(null);
  }

  private updateRouteContext(route: string): void {
    if (route.includes('/products/')) {
      return;
    }

    this.store.setPageContext({ route });
  }
}
