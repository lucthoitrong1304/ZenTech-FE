import { CommonModule } from '@angular/common';
import { Component, input, output, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import {
  LucideX,
  LucideTriangleAlert,
  LucideWarehouse,
  LucidePlusCircle,
  LucideMinusCircle,
} from '@lucide/angular';
import {
  InventorySummary,
  InventoryTransactionType,
  InventoryTransactionReason,
  InventoryAdjustmentRequest,
} from '../../data-access/models/inventory.model';

@Component({
  selector: 'app-inventory-adjust-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    LucideX,
    LucideTriangleAlert,
    LucideWarehouse,
    LucidePlusCircle,
    LucideMinusCircle,
  ],
  templateUrl: './inventory-adjust-dialog.component.html',
  styleUrl: './inventory-adjust-dialog.component.css',
})
export class InventoryAdjustDialogComponent {
  // Signal inputs & outputs
  visible = input.required<boolean>();
  item = input<InventorySummary | null>(null);
  saving = input<boolean>(false);
  errorMessage = input<string | null>(null);

  close = output<void>();
  submitAdjust = output<InventoryAdjustmentRequest>();

  protected readonly InventoryTransactionType = InventoryTransactionType;

  // Local Form state
  type = signal<InventoryTransactionType>(InventoryTransactionType.IMPORT);
  quantity = signal<number>(1);
  reason = signal<InventoryTransactionReason>(InventoryTransactionReason.NEW_STOCK);
  note = signal<string>('');

  constructor() {
    // Reset form when visible changes or item changes
    effect(() => {
      if (this.visible() && this.item()) {
        this.type.set(InventoryTransactionType.IMPORT);
        this.quantity.set(1);
        this.reason.set(InventoryTransactionReason.NEW_STOCK);
        this.note.set('');
      }
    });
  }

  protected setType(newType: InventoryTransactionType): void {
    this.type.set(newType);
    if (newType === InventoryTransactionType.IMPORT) {
      this.reason.set(InventoryTransactionReason.NEW_STOCK);
    } else {
      this.reason.set(InventoryTransactionReason.DAMAGED);
    }
  }

  protected getAvailableReasons(): { value: InventoryTransactionReason; label: string }[] {
    if (this.type() === InventoryTransactionType.IMPORT) {
      return [
        { value: InventoryTransactionReason.NEW_STOCK, label: 'Nhập hàng mới' },
        { value: InventoryTransactionReason.ADJUSTMENT_ADD, label: 'Điều chỉnh tăng (Kiểm kho)' },
        { value: InventoryTransactionReason.RETURN, label: 'Khách hàng trả hàng' },
      ];
    } else {
      return [
        { value: InventoryTransactionReason.DAMAGED, label: 'Xuất hủy hàng hỏng' },
        { value: InventoryTransactionReason.ADJUSTMENT_SUB, label: 'Điều chỉnh giảm (Kiểm kho)' },
      ];
    }
  }

  protected onSubmit(): void {
    const currentItem = this.item();
    if (!currentItem) return;

    if (this.quantity() <= 0) {
      return;
    }

    const payload: InventoryAdjustmentRequest = {
      productVariantId: currentItem.variantId,
      type: this.type(),
      quantity: this.quantity(),
      reason: this.reason(),
      note: this.note().trim(),
    };

    this.submitAdjust.emit(payload);
  }
}
