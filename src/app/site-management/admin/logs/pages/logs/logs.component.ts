import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideSearch,
  LucideTrash2,
  LucideChevronDown,
  LucideChevronUp
} from '@lucide/angular';
import { AdminStore } from '../../../data-access/store/admin.store';
import { LogLevel } from '../../../data-access/models/admin.models';

@Component({
  selector: 'app-admin-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideSearch,
    LucideTrash2,
    LucideChevronDown,
    LucideChevronUp
  ],
  templateUrl: './logs.component.html',
  styleUrl: './logs.component.css'
})
export class LogsComponent {
  protected readonly store = inject(AdminStore);
  protected readonly LogLevel = LogLevel;

  protected readonly activeFilter = signal<LogLevel | 'ALL'>('ALL');
  protected readonly searchText = signal('');
  protected readonly expandedLogId = signal<string | null>(null);

  protected handleFilterChange(filter: LogLevel | 'ALL'): void {
    this.activeFilter.set(filter);
    this.store.setLogFilter(filter);
  }

  protected handleSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    this.store.setLogSearch(value);
  }

  protected toggleExpand(logId: string): void {
    if (this.expandedLogId() === logId) {
      this.expandedLogId.set(null);
    } else {
      this.expandedLogId.set(logId);
    }
  }

  protected handleClearLogs(): void {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ logs hiện tại không?')) {
      this.store.clearLogs();
    }
  }
}
