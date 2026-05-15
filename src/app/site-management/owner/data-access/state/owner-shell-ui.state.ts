import { Injectable, signal } from '@angular/core';

export type OwnerSidebarMode = 'admin' | 'chatFilters';

@Injectable()
export class OwnerShellUiState {
  readonly sidebarMode = signal<OwnerSidebarMode>('admin');

  showAdminSidebar(): void {
    this.sidebarMode.set('admin');
  }

  showChatFilters(): void {
    this.sidebarMode.set('chatFilters');
  }
}
