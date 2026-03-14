import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Order, OrderStatus } from '../orders';

@Component({
  selector: 'app-order-status-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './order-status-dialog.component.html',
  styleUrl: './order-status-dialog.component.css',
})
export class OrderStatusDialog {
  statusEnum = OrderStatus;

  statusOptions = Object.values(OrderStatus).map((value) => ({
    label: value,
    value: value,
  }));

  selectedStatus: OrderStatus;
  notes: string = '';

  constructor(
    public dialogRef: MatDialogRef<OrderStatusDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { order: Order },
  ) {
    this.selectedStatus = this.data.order.status;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onUpdate(): void {
    this.dialogRef.close({
      newStatus: this.selectedStatus,
      notes: this.notes,
    });
  }

  getStatusClass(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:
        return 'order-status--pending';
      case OrderStatus.PROCESSING:
        return 'order-status--processing';
      case OrderStatus.SHIPPED:
        return 'order-status--shipped';
      case OrderStatus.DELIVERED:
        return 'order-status--delivered';
      case OrderStatus.CANCELED:
        return 'order-status--canceled';
      case OrderStatus.RETURNED:
        return 'order-status--returned';
      default:
        return 'order-status--default';
    }
  }

  // Helper just to mock some history based on status
  getHistory(): { status: OrderStatus; time: string; done: boolean }[] {
    const defaultHistory = [
      { status: OrderStatus.PENDING, time: '14/03/2026 10:30', done: true },
      { status: OrderStatus.PROCESSING, time: '14/03/2026 10:45', done: true },
      {
        status: OrderStatus.SHIPPED,
        time: '14/03/2026 11:10',
        done: this.isDoneOrPassed(OrderStatus.SHIPPED),
      },
      { status: OrderStatus.DELIVERED, time: '', done: this.isDoneOrPassed(OrderStatus.DELIVERED) },
    ];
    return defaultHistory;
  }

  // simple mock for UI
  isDoneOrPassed(targetStatus: OrderStatus): boolean {
    const currentStatus = this.data.order.status;
    const allStatuses = Object.values(OrderStatus);
    const targetIdx = allStatuses.indexOf(targetStatus);
    const currentIdx = allStatuses.indexOf(currentStatus);
    return (
      currentIdx >= targetIdx &&
      currentStatus !== OrderStatus.CANCELED &&
      currentStatus !== OrderStatus.RETURNED
    );
  }
}
