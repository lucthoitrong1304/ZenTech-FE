import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { LucideX } from '@lucide/angular';
import {
  ManagementOrder,
  ManagementOrderEditDraft,
  ManagementOrderFormErrors,
  ManagementOrderStatus,
} from '../../data-access/models/management-order.models';

@Component({
  selector: 'app-order-edit-drawer',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, LucideX],
  templateUrl: './order-edit-drawer.component.html',
  styleUrl: './order-edit-drawer.component.css',
})
export class OrderEditDrawerComponent {
  readonly visible = input.required<boolean>();
  readonly order = input.required<ManagementOrder | null>();
  readonly draft = input.required<ManagementOrderEditDraft | null>();
  readonly errors = input.required<ManagementOrderFormErrors>();
  readonly saving = input.required<boolean>();

  readonly close = output<void>();
  readonly cancel = output<void>();
  readonly save = output<void>();
  readonly draftChange = output<Partial<ManagementOrderEditDraft>>();
  readonly quantityChange = output<{ orderItemId: string; quantity: number }>();

  protected onCustomerNameInput(event: Event): void {
    this.draftChange.emit({ customerName: readInputValue(event) });
  }

  protected onShippingAddressInput(event: Event): void {
    this.draftChange.emit({ shippingAddress: readTextAreaValue(event) });
  }

  protected onStatusChange(event: Event): void {
    this.draftChange.emit({ orderStatus: readSelectValue(event) as ManagementOrderStatus });
  }

  protected getDraftQuantity(orderItemId: string): number {
    return this.draft()?.items.find(item => item.orderItemId === orderItemId)?.quantity ?? 1;
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.save.emit();
  }
}

function readInputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : '';
}

function readTextAreaValue(event: Event): string {
  return event.target instanceof HTMLTextAreaElement ? event.target.value : '';
}

function readSelectValue(event: Event): string {
  return event.target instanceof HTMLSelectElement ? event.target.value : '';
}
