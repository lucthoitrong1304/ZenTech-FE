import { CommonModule } from '@angular/common';
import { Component, input, output, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideX, LucideTriangleAlert, LucideSparkles } from '@lucide/angular';
import { DialogModule } from 'primeng/dialog';
import { CouponFormValue, CouponType } from '../../data-access/models/marketing.models';

@Component({
  selector: 'app-coupon-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, LucideX, LucideTriangleAlert, LucideSparkles],
  templateUrl: './coupon-dialog.component.html',
  styleUrl: './coupon-dialog.component.css',
})
export class CouponDialogComponent {
  visible = input<boolean>(false);
  mode = input<'create' | 'edit'>('create');
  draft = input<CouponFormValue | null>(null);
  saving = input<boolean>(false);
  loadingDetail = input<boolean>(false);
  errors = input<Record<string, string>>({});

  close = output<void>();
  save = output<void>();
  draftChange = output<Partial<CouponFormValue>>();

  protected readonly currentStep = signal<number>(1);
  protected readonly CouponType = CouponType;

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.currentStep.set(1);
      }
    });
  }

  protected get steps() {
    return [
      { step: 1, label: 'Thông tin chung' },
      { step: 2, label: 'Điều kiện áp dụng' },
      { step: 3, label: 'Giới hạn & Thời gian' },
    ];
  }

  protected nextStep(): void {
    if (this.currentStep() < 3) {
      this.currentStep.update(s => s + 1);
    }
  }

  protected prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  protected updateValue(key: keyof CouponFormValue, value: string | number | boolean | null): void {
    if (key === 'code' && typeof value === 'string') {
      value = value.trim().toUpperCase();
    }
    this.draftChange.emit({ [key]: value });
  }

  protected onSubmit(): void {
    this.save.emit();
  }
}
