import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideMessageSquare,
  LucideSend
} from '@lucide/angular';
import { AdminStore } from '../../../data-access/store/admin.store';
import { TicketStatus, SupportTicket, TicketMessageSender } from '../../../data-access/models/admin.models';

@Component({
  selector: 'app-admin-tickets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideMessageSquare,
    LucideSend
  ],
  templateUrl: './tickets.component.html',
  styleUrl: './tickets.component.css'
})
export class TicketsComponent {
  protected readonly store = inject(AdminStore);
  protected readonly TicketStatus = TicketStatus;
  protected readonly TicketMessageSender = TicketMessageSender;

  protected readonly activeFilter = signal<TicketStatus | 'ALL'>('ALL');
  protected readonly selectedTicketId = signal<string | null>(null);

  protected replyText = '';

  protected handleFilterChange(filter: TicketStatus | 'ALL'): void {
    this.activeFilter.set(filter);
    this.store.setTicketFilter(filter);
    // Clear selection if filtered out
    const activeTicket = this.getSelectedTicket();
    if (activeTicket && filter !== 'ALL' && activeTicket.status !== filter) {
      this.selectedTicketId.set(null);
    }
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
}
