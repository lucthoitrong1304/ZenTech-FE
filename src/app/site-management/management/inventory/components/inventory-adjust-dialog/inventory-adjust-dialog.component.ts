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
  defaultWarehouse = input<'MAIN' | 'FAULTY'>('MAIN');

  close = output<void>();
  submitAdjust = output<InventoryAdjustmentRequest>();

  protected readonly InventoryTransactionType = InventoryTransactionType;

  // Local Form state
  type = signal<InventoryTransactionType>(InventoryTransactionType.IMPORT);
  quantity = signal<number>(1);
  reason = signal<InventoryTransactionReason>(InventoryTransactionReason.NEW_STOCK);
  note = signal<string>('');
  targetWarehouse = signal<'MAIN' | 'FAULTY'>('MAIN');

  constructor() {
    // Reset form when visible changes or item changes
    effect(() => {
      if (this.visible() && this.item()) {
        const defaultWh = this.defaultWarehouse();
        this.type.set(InventoryTransactionType.IMPORT);
        this.quantity.set(1);
        this.targetWarehouse.set(defaultWh);
        this.reason.set(defaultWh === 'FAULTY' ? InventoryTransactionReason.ADJUSTMENT_ADD : InventoryTransactionReason.NEW_STOCK);
        this.note.set('');
      }
    });
  }

  protected setWarehouse(wh: 'MAIN' | 'FAULTY'): void {
    this.targetWarehouse.set(wh);
    if (wh === 'FAULTY' && this.type() === InventoryTransactionType.IMPORT) {
      if (this.reason() === InventoryTransactionReason.NEW_STOCK) {
        this.reason.set(InventoryTransactionReason.ADJUSTMENT_ADD);
      }
    }
  }

  protected setType(newType: InventoryTransactionType): void {
    this.type.set(newType);
    if (newType === InventoryTransactionType.IMPORT) {
      if (this.targetWarehouse() === 'FAULTY') {
        this.reason.set(InventoryTransactionReason.ADJUSTMENT_ADD);
      } else {
        this.reason.set(InventoryTransactionReason.NEW_STOCK);
      }
    } else {
      this.reason.set(InventoryTransactionReason.DAMAGED);
    }
  }

  protected getAvailableReasons(): { value: InventoryTransactionReason; label: string }[] {
    const isFaulty = this.targetWarehouse() === 'FAULTY';
    if (this.type() === InventoryTransactionType.IMPORT) {
      const reasons = [
        { value: InventoryTransactionReason.NEW_STOCK, label: 'Nhập hàng mới' },
        { value: InventoryTransactionReason.ADJUSTMENT_ADD, label: isFaulty ? 'Điều chỉnh tăng kho lỗi' : 'Điều chỉnh tăng (Kiểm kho)' },
        { value: InventoryTransactionReason.RETURN, label: isFaulty ? 'Khách trả hàng lỗi' : 'Khách hàng trả hàng' },
      ];
      return isFaulty ? reasons.filter(r => r.value !== InventoryTransactionReason.NEW_STOCK) : reasons;
    } else {
      return [
        { value: InventoryTransactionReason.DAMAGED, label: isFaulty ? 'Tiêu hủy hàng lỗi (Hủy vĩnh viễn)' : 'Xuất kho hàng hỏng (Chuyển vào kho lỗi)' },
        { value: InventoryTransactionReason.ADJUSTMENT_SUB, label: isFaulty ? 'Điều chỉnh giảm kho lỗi' : 'Điều chỉnh giảm (Kiểm kho)' },
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
      targetWarehouse: this.targetWarehouse(),
    };

    this.submitAdjust.emit(payload);
  }
}
