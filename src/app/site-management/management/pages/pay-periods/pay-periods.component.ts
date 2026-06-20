import { Component, OnInit, inject, signal } from '@angular/core';
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
  standalone: true,
  imports: [CommonModule, FormsModule, LucideLock, LucideUnlock, LucidePlus, LucideLoader2],
  template: `
    <div class="flex flex-col gap-6 p-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Quản lý kỳ công</h1>
          <p class="text-gray-500 text-sm mt-1">Tạo kỳ công và quản lý khóa dữ liệu tính công hàng tháng.</p>
        </div>
        <button (click)="openCreateModal()" 
                class="bg-[#FFC700] hover:bg-[#FFD633] text-gray-900 font-medium px-4 py-2 rounded-full transition-colors text-sm flex items-center gap-2">
          <svg lucidePlus class="w-4 h-4"></svg>
          Tạo kỳ công
        </button>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-200">
              <th class="text-gray-500 font-medium text-sm py-3 px-4">Tên kỳ công</th>
              <th class="text-gray-500 font-medium text-sm py-3 px-4">Bắt đầu</th>
              <th class="text-gray-500 font-medium text-sm py-3 px-4">Kết thúc</th>
              <th class="text-gray-500 font-medium text-sm py-3 px-4">Trạng thái</th>
              <th class="text-gray-500 font-medium text-sm py-3 px-4">Chi tiết khóa</th>
              <th class="text-gray-500 font-medium text-sm py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            @for (period of periods(); track period.id) {
              <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-4 px-4 font-semibold text-gray-900">{{ period.name }}</td>
                <td class="py-4 px-4 text-gray-600">{{ period.startDate }}</td>
                <td class="py-4 px-4 text-gray-600">{{ period.endDate }}</td>
                <td class="py-4 px-4">
                  @if (period.locked) {
                    <span class="px-2 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1 w-fit">
                      <svg lucideLock class="w-3.5 h-3.5"></svg> Đã khóa
                    </span>
                  } @else {
                    <span class="px-2 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1 w-fit">
                      <svg lucideUnlock class="w-3.5 h-3.5"></svg> Đang mở
                    </span>
                  }
                </td>
                <td class="py-4 px-4 text-gray-500 text-xs">
                  @if (period.locked && period.lockedBy) {
                    <span>Khóa bởi {{ period.lockedBy.fullName }} lúc {{ period.lockedAt | date:'dd/MM/yyyy HH:mm' }}</span>
                  } @else {
                    <span>--</span>
                  }
                </td>
                <td class="py-4 px-4 text-right">
                  <button (click)="toggleLock(period)" 
                          [disabled]="submittingId() === period.id"
                          [ngClass]="period.locked ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'"
                          class="text-white text-xs px-3 py-1.5 rounded-full font-medium transition-colors disabled:opacity-50">
                    @if (submittingId() === period.id) {
                      <svg lucideLoader2 class="w-3.5 h-3.5 animate-spin inline mr-1"></svg>
                    }
                    {{ period.locked ? 'Mở khóa' : 'Khóa kỳ công' }}
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="text-center py-8 text-gray-500">Chưa có kỳ công nào được tạo.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Create Modal -->
      @if (modalOpen()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <header class="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 class="font-bold text-gray-900">Tạo kỳ công mới</h2>
              <button (click)="closeCreateModal()" class="text-gray-400 hover:text-gray-600">✕</button>
            </header>
            <div class="p-4 flex flex-col gap-4">
              <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                Tên kỳ công
                <input type="text" [(ngModel)]="newPeriod.name" placeholder="Ví dụ: Kỳ công Tháng 06/2026" class="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#FFC700] outline-none" />
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                Ngày bắt đầu
                <input type="date" [(ngModel)]="newPeriod.startDate" class="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#FFC700] outline-none" />
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                Ngày kết thúc
                <input type="date" [(ngModel)]="newPeriod.endDate" class="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#FFC700] outline-none" />
              </label>
            </div>
            <footer class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button (click)="closeCreateModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100 font-medium">Hủy</button>
              <button (click)="createPeriod()" class="px-4 py-2 bg-[#FFC700] text-gray-900 rounded-lg text-sm hover:bg-[#FFD633] font-medium">Tạo mới</button>
            </footer>
          </div>
        </div>
      }
    </div>
  `
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
