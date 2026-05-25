import { Injectable, signal } from '@angular/core';

export type ManagementSidebarMode = 'admin' | 'chatFilters';

@Injectable()
export class ManagementShellUiState {
  readonly sidebarMode = signal<ManagementSidebarMode>('admin');

  showAdminSidebar(): void {
    this.sidebarMode.set('admin');
  }

  showChatFilters(): void {
    this.sidebarMode.set('chatFilters');
  }
}
