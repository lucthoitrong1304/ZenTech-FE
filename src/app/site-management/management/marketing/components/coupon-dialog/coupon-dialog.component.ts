import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideX, LucideTriangleAlert, LucideSparkles } from '@lucide/angular';
import { DatePicker } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { CouponFormValue, CouponType } from '../../data-access/models/marketing.models';

@Component({
  selector: 'app-coupon-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, DatePicker, LucideX, LucideTriangleAlert, LucideSparkles],
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
  protected readonly startAtDate = computed(() => this.toDate(this.draft()?.startAt ?? null));
  protected readonly endAtDate = computed(() => this.toDate(this.draft()?.endAt ?? null));

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

  protected toDate(value: string | null): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  protected updateDateTimeValue(key: 'startAt' | 'endAt', value: Date | null): void {
    const nextValue = value ? this.toLocalDateTimeValue(value) : null;
    if (this.draft()?.[key] === nextValue) {
      return;
    }

    this.draftChange.emit({ [key]: nextValue });
  }

  private toLocalDateTimeValue(value: Date): string {
    return [
      `${value.getFullYear()}-${this.pad(value.getMonth() + 1)}-${this.pad(value.getDate())}`,
      `${this.pad(value.getHours())}:${this.pad(value.getMinutes())}`,
    ].join('T');
  }

  private pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  protected onSubmit(): void {
    this.save.emit();
  }
}
