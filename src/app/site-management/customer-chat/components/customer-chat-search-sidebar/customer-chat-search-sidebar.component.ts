import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideX, LucideSearch, LucideLoader2, LucideSearchX, LucideMessageSquare } from '@lucide/angular';
import { ChatMessageResponse } from '../../data-access/models/customer-chat.models';

@Component({
  selector: 'app-customer-chat-search-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, LucideX, LucideSearch, LucideLoader2, LucideSearchX, LucideMessageSquare],
  templateUrl: './customer-chat-search-sidebar.component.html',
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `],
})
export class CustomerChatSearchSidebarComponent {
  open = input.required<boolean>();
  isSearching = input.required<boolean>();
  results = input.required<ChatMessageResponse[]>();
  
  closed = output<void>();
  searchKeywordChanged = output<string>();
  resultSelected = output<string>();

  keyword = signal('');
  
  private searchTimeout: any;

  onSearchChange(val: string) {
    this.keyword.set(val);
    
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    this.searchTimeout = setTimeout(() => {
      this.searchKeywordChanged.emit(val);
    }, 500); // 500ms debounce
  }

  onResultClick(messageId: string) {
    this.resultSelected.emit(messageId);
  }
}
