import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideSearch } from '@lucide/angular';
import { AdminStore } from '../../../data-access/store/admin.store';

@Component({
  selector: 'app-admin-activity-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideSearch
  ],
  templateUrl: './activity-logs.component.html',
  styleUrl: './activity-logs.component.css'
})
export class ActivityLogsComponent {
  protected readonly store = inject(AdminStore);
  protected readonly searchText = signal('');

  protected handleSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    this.store.setActivitySearch(value);
  }
}
