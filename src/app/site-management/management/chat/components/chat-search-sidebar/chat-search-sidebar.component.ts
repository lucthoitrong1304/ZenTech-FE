import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideX, LucideSearch, LucideLoader2, LucideSearchX, LucideMessageSquare } from '@lucide/angular';
import { ChatMessageResponse } from '../../../../customer-chat/data-access/models/customer-chat.models';

@Component({
  selector: 'app-chat-search-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideX, LucideSearch, LucideLoader2, LucideSearchX, LucideMessageSquare],
  templateUrl: './chat-search-sidebar.component.html',
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `],
})
export class ChatSearchSidebarComponent {
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
