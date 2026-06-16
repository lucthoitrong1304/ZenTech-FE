import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideMessageSquare,
  LucideSend,
  LucideSearch,
  LucideRotateCcw
} from '@lucide/angular';
import { AdminStore } from '../../../data-access/store/admin.store';
import { TicketStatus, SupportTicket, TicketMessageSender, TicketPriority } from '../../../data-access/models/admin.models';

@Component({
  selector: 'app-admin-tickets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideMessageSquare,
    LucideSend,
    LucideSearch,
    LucideRotateCcw
  ],
  templateUrl: './tickets.component.html',
  styleUrl: './tickets.component.css'
})
export class TicketsComponent implements OnInit {
  protected readonly store = inject(AdminStore);
  protected readonly TicketStatus = TicketStatus;
  protected readonly TicketPriority = TicketPriority;
  protected readonly TicketMessageSender = TicketMessageSender;

  protected readonly activeFilter = signal<TicketStatus | 'ALL'>('ALL');
  protected readonly selectedTicketId = signal<string | null>(null);

  protected replyText = '';

  // Advanced Filter values
  protected searchVal = '';
  protected priorityVal: TicketPriority | 'ALL' = 'ALL';
  protected startDateVal = '';
  protected endDateVal = '';

  ngOnInit(): void {
    this.store.loadTickets({});
  }

  protected handleFilterChange(filter: TicketStatus | 'ALL'): void {
    this.activeFilter.set(filter);
    this.store.setTicketFilter(filter);
    this.store.loadTickets({
      status: filter === 'ALL' ? undefined : filter
    });
    
    // Clear selection if filtered out
    const activeTicket = this.getSelectedTicket();
    if (activeTicket && filter !== 'ALL' && activeTicket.status !== filter) {
      this.selectedTicketId.set(null);
    }
  }

  protected onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchVal = input.value;
    this.store.setTicketSearch(this.searchVal);
  }

  protected onPriorityFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.priorityVal = select.value as TicketPriority | 'ALL';
    this.store.setTicketPriorityFilter(this.priorityVal);
  }

  protected onDateRangeChange(): void {
    const start = this.startDateVal ? this.startDateVal : null;
    const end = this.endDateVal ? this.endDateVal : null;
    this.store.setTicketDateRange(start, end);
  }

  protected handleResetFilters(): void {
    this.searchVal = '';
    this.priorityVal = 'ALL';
    this.startDateVal = '';
    this.endDateVal = '';
    this.activeFilter.set('ALL');
    this.store.resetTicketFilters();
    this.store.loadTickets({});
  }

  protected selectTicket(id: string): void {
    this.selectedTicketId.set(id);
    this.replyText = '';
  }

  protected getSelectedTicket(): SupportTicket | null {
    const id = this.selectedTicketId();
    if (!id) return null;
    return this.store.tickets().find(t => t.id === id) || null;
  }

  protected handleSendReply(): void {
    const ticketId = this.selectedTicketId();
    if (!ticketId || !this.replyText.trim()) return;

    this.store.addTicketMessage(ticketId, this.replyText.trim());
    this.replyText = '';
  }

  protected handleStatusChange(event: Event): void {
    const ticketId = this.selectedTicketId();
    if (!ticketId) return;

    const select = event.target as HTMLSelectElement;
    this.store.updateTicketStatus(ticketId, select.value as TicketStatus);
  }

  // Avatar generation helpers
  protected getInitials(name: string): string {
    const initials = (name || 'ZT')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
    return initials || 'ZT';
  }

  protected getAvatarGradient(email: string): string {
    if (!email) {
      return 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)';
    }
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradients = [
      'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
      'linear-gradient(135deg, #4E65FF 0%, #92EFFD 100%)',
      'linear-gradient(135deg, #76B852 0%, #8DC26F 100%)',
      'linear-gradient(135deg, #F2709C 0%, #FF9472 100%)',
      'linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%)',
      'linear-gradient(135deg, #11998E 0%, #38EF7D 100%)',
      'linear-gradient(135deg, #8A2387 0%, #E94057 100%)',
      'linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    ];
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  }
}
