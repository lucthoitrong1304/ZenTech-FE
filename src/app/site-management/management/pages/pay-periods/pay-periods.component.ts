import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { LucideLock, LucideUnlock, LucidePlus, LucideLoader2 } from '@lucide/angular';

interface PayPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  locked: boolean;
  lockedBy?: { fullName: string } | null;
  lockedAt?: string | null;
}

@Component({
  selector: 'app-pay-periods',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, LucideLock, LucideUnlock, LucidePlus, LucideLoader2],
  templateUrl: './pay-periods.component.html',
  styleUrl: './pay-periods.component.css'
})
export class PayPeriodsComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly toastService = inject(ToastService);
  private readonly baseUrl = `${environment.apiBaseUrl}/management/pay-periods`;

  periods = signal<PayPeriod[]>([]);
  modalOpen = signal(false);
  submittingId = signal<string | null>(null);

  newPeriod = {
    name: '',
    startDate: '',
    endDate: ''
  };

  ngOnInit() {
    this.loadPeriods();
  }

  loadPeriods() {
    this.apiService.get<{ success: boolean; data: PayPeriod[] }>(this.baseUrl).subscribe({
      next: (res) => {
        if (res.success) {
          this.periods.set(res.data);
        }
      },
      error: (err) => this.toastService.error(err.error?.message || 'Không thể tải danh sách kỳ công')
    });
  }

  openCreateModal() {
    this.newPeriod = {
      name: '',
      startDate: '',
      endDate: ''
    };
    this.modalOpen.set(true);
  }

  closeCreateModal() {
    this.modalOpen.set(false);
  }

  createPeriod() {
    if (!this.newPeriod.name || !this.newPeriod.startDate || !this.newPeriod.endDate) {
      this.toastService.error('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    this.apiService.post<any, any>(this.baseUrl, this.newPeriod).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Tạo kỳ công thành công.');
          this.modalOpen.set(false);
          this.loadPeriods();
        }
      },
      error: (err) => this.toastService.error(err.error?.message || 'Không thể tạo kỳ công')
    });
  }

  toggleLock(period: PayPeriod) {
    this.submittingId.set(period.id);
    const lock = !period.locked;
    this.apiService.post<any, any>(`${this.baseUrl}/${period.id}/lock`, null, {
      params: { lock: lock.toString() }
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success(lock ? 'Đã khóa kỳ công.' : 'Đã mở khóa kỳ công.');
          this.loadPeriods();
        }
        this.submittingId.set(null);
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Thao tác thất bại.');
        this.submittingId.set(null);
      }
    });
  }
}
