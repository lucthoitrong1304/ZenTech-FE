import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { filter, map } from 'rxjs';
import { ToastComponent } from './shared/components/toast/toast.component';
import { CustomerChatPopupComponent } from './site-management/customer-chat/components/customer-chat-popup/customer-chat-popup.component';
import { CategoryNavigationStore } from './site-management/shared/data-access/store/category-navigation.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConfirmDialogModule, ToastComponent, CustomerChatPopupComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly categoryNavigationStore = inject(CategoryNavigationStore);
  private readonly router = inject(Router);
  protected readonly title = signal('ZenTech-FE');
  protected readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );
  protected readonly showCustomerChat = computed(() => {
    const url = this.currentUrl();

    return !(
      url === '/chat' ||
      url.startsWith('/owner') ||
      url.startsWith('/auth') ||
      url.startsWith('/error')
    );
  });

  constructor() {
    this.categoryNavigationStore.loadCategoriesOnce();
  }
}
