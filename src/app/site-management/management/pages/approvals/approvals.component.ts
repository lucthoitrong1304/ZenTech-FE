import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { LucideRefreshCw, LucideCheck, LucideX } from '@lucide/angular';

interface LeaveRequest {
  id: string;
  employee: { fullName: string };
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
  status: string;
}

interface ShiftSwapRequest {
  id: string;
  requester: { fullName: string };
  targetEmployee: { fullName: string };
  workDate: string;
  shift: { name: string; startTime: string; endTime: string };
  targetWorkDate?: string;
  targetShift?: { name: string; startTime: string; endTime: string } | null;
  type: string;
  reason: string;
  status: string;
}

interface AttendanceAdjustment {
  id: string;
  employee: { fullName: string };
  workDate: string;
  type: string;
  proposedTime: string;
  reason: string;
  status: string;
}

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideRefreshCw, LucideCheck, LucideX],
  template: `
    <div class="flex flex-col gap-6 p-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Duyệt yêu cầu</h1>
          <p class="text-gray-500 text-sm mt-1">Phê duyệt các đề xuất nghỉ phép, đổi ca và điều chỉnh công của nhân viên.</p>
        </div>
        <button (click)="loadAllPending()" class="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
          <svg lucideRefreshCw class="w-4 h-4"></svg>
        </button>
      </div>

      <!-- Tab Buttons -->
      <div class="flex border-b border-gray-200 gap-4">
        <button (click)="activeTab.set('leave')" 
                [ngClass]="activeTab() === 'leave' ? 'border-[#FFC700] text-gray-900 font-semibold' : 'border-transparent text-gray-500'"
                class="py-2.5 px-4 border-b-2 text-sm transition-all flex items-center gap-2">
          Nghỉ phép ({{ leaves().length }})
        </button>
        <button (click)="activeTab.set('swap')" 
                [ngClass]="activeTab() === 'swap' ? 'border-[#FFC700] text-gray-900 font-semibold' : 'border-transparent text-gray-500'"
                class="py-2.5 px-4 border-b-2 text-sm transition-all flex items-center gap-2">
          Đổi ca / Làm thay ({{ swaps().length }})
        </button>
        <button (click)="activeTab.set('adjust')" 
                [ngClass]="activeTab() === 'adjust' ? 'border-[#FFC700] text-gray-900 font-semibold' : 'border-transparent text-gray-500'"
                class="py-2.5 px-4 border-b-2 text-sm transition-all flex items-center gap-2">
          Chỉnh sửa công ({{ adjustments().length }})
        </button>
      </div>

      <!-- Content Tables -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <!-- Leave Table -->
        @if (activeTab() === 'leave') {
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200">
                <th class="text-gray-500 font-medium text-sm py-3 px-4">Nhân viên</th>
                <th class="text-gray-500 font-medium text-sm py-3 px-4">Thời gian nghỉ</th>
                <th class="text-gray-500 font-medium text-sm py-3 px-4">Loại phép</th>
                <th class="text-gray-500 font-medium text-sm py-3 px-4">Lý do</th>
                <th class="text-gray-500 font-medium text-sm py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              @for (req of leaves(); track req.id) {
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                  <td class="py-3.5 px-4 font-semibold text-gray-900">{{ req.employee.fullName }}</td>
                  <td class="py-3.5 px-4 text-gray-600">{{ req.startDate }} -> {{ req.endDate }}</td>
                  <td class="py-3.5 px-4">
                    <span class="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md">
                      {{ req.leaveType }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-gray-600 text-sm">{{ req.reason }}</td>
                  <td class="py-3.5 px-4 text-right flex justify-end gap-2">
                    <button (click)="approveLeave(req.id, 'APPROVED')" class="bg-green-600 text-white p-1.5 rounded-full hover:bg-green-700">
                      <svg lucideCheck class="w-4 h-4"></svg>
                    </button>
                    <button (click)="approveLeave(req.id, 'REJECTED')" class="bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700">
                      <svg lucideX class="w-4 h-4"></svg>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="text-center py-8 text-gray-500">Không có yêu cầu nghỉ phép nào cần duyệt.</td></tr>
              }
            </tbody>
          </table>
        }

        <!-- Swap Table -->
        @if (activeTab() === 'swap') {
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200">
                <th class="text-gray-500 font-medium text-sm py-3 px-4">Người yêu cầu</th>
                <th class="text-gray-500 font-medium text-sm py-3 px-4">Loại hình</th>
                <th class="text-gray-500 font-medium text-sm py-3 px-4">Ca cần đổi / thay</th>
                <th class="text-gray-500 font-medium text-sm py-3 px-4">Người làm thay / đổi</th>
                <th class="text-gray-500 font-medium text-sm py-3 px-4">Ca nhận lại (nếu swap)</th>
                <th class="text-gray-500 font-medium text-sm py-3 px-4">Lý do</th>
                <th class="text-gray-500 font-medium text-sm py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              @for (req of swaps(); track req.id) {
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                  <td class="py-3.5 px-4 font-semibold text-gray-900">{{ req.requester.fullName }}</td>
                  <td class="py-3.5 px-4 text-xs font-semibold text-gray-700">{{ req.type }}</td>
                  <td class="py-3.5 px-4 text-sm text-gray-600">
                    {{ req.workDate }} · {{ req.shift.name }} ({{ req.shift.startTime.slice(0,5) }}-{{ req.shift.endTime.slice(0,5) }})
                  </td>
                  <td class="py-3.5 px-4 font-medium text-gray-900">{{ req.targetEmployee.fullName }}</td>
                  <td class="py-3.5 px-4 text-sm text-gray-600">
                    @if (req.type === 'SWAP' && req.targetWorkDate) {
                      <span>{{ req.targetWorkDate }} · {{ req.targetShift?.name }}</span>
                    } @else {
                      <span>--</span>
                    }
                  </td>
                  <td class="py-3.5 px-4 text-gray-600 text-sm">{{ req.reason }}</td>
                  <td class="py-3.5 px-4 text-right flex justify-end gap-2">
                    <button (click)="approveSwap(req.id, 'APPROVED')" class="bg-green-600 text-white p-1.5 rounded-full hover:bg-green-700">
                      <svg lucideCheck class="w-4 h-4"></svg>
                    </button>
                    <button (click)="approveSwap(req.id, 'REJECTED')" class="bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700">
                      <svg lucideX class="w-4 h-4"></svg>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="text-center py-8 text-gray-500">Không có yêu cầu đổi ca nào cần duyệt.</td></tr>
              }
            </tbody>
          </table>
        }

        <!-- Adjust Table -->
        @if (activeTab() === 'adjust') {
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200">
                <th class="text-gray-500 font-medium text-sm py-3 px-4">Nhân viên</th>
                <th class="text-gray-500 font-medium text-sm py-3 px-4">Ngày cần sửa</th>
                <th class="text-gray-500 font-medium text-sm py-3 px-4">Loại điều chỉnh</th>
                <th class="text-gray-500 font-medium text-sm py-3 px-4">Giờ đề xuất</th>
                <th class="text-gray-500 font-medium text-sm py-3 px-4">Lý do giải trình</th>
                <th class="text-gray-500 font-medium text-sm py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              @for (req of adjustments(); track req.id) {
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                  <td class="py-3.5 px-4 font-semibold text-gray-900">{{ req.employee.fullName }}</td>
                  <td class="py-3.5 px-4 text-gray-600">{{ req.workDate }}</td>
                  <td class="py-3.5 px-4">
                    <span class="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-md">
                      {{ req.type }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 font-semibold text-gray-900">{{ req.proposedTime.slice(0,5) }}</td>
                  <td class="py-3.5 px-4 text-gray-600 text-sm">{{ req.reason }}</td>
                  <td class="py-3.5 px-4 text-right flex justify-end gap-2">
                    <button (click)="approveAdjust(req.id, 'APPROVED')" class="bg-green-600 text-white p-1.5 rounded-full hover:bg-green-700">
                      <svg lucideCheck class="w-4 h-4"></svg>
                    </button>
                    <button (click)="openRejectDialog(req.id)" class="bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700">
                      <svg lucideX class="w-4 h-4"></svg>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="text-center py-8 text-gray-500">Không có yêu cầu chỉnh công nào cần duyệt.</td></tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Reject Dialog (for adjustments) -->
      @if (rejectModalOpen()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <header class="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 class="font-bold text-gray-900">Từ chối điều chỉnh công</h2>
              <button (click)="closeRejectDialog()" class="text-gray-400 hover:text-gray-600">✕</button>
            </header>
            <div class="p-4 flex flex-col gap-4">
              <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                Lý do từ chối
                <textarea [(ngModel)]="rejectionReason" rows="3" placeholder="Nhập lý do từ chối..." class="border border-gray-300 rounded-lg p-2 Outline-none"></textarea>
              </label>
            </div>
            <footer class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button (click)="closeRejectDialog()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100 font-medium">Hủy</button>
              <button (click)="rejectAdjust()" class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 font-medium">Từ chối</button>
            </footer>
          </div>
        </div>
      }
    </div>
  `
})
export class ApprovalsComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly toastService = inject(ToastService);

  activeTab = signal<'leave' | 'swap' | 'adjust'>('leave');

  leaves = signal<LeaveRequest[]>([]);
  swaps = signal<ShiftSwapRequest[]>([]);
  adjustments = signal<AttendanceAdjustment[]>([]);

  rejectModalOpen = signal(false);
  rejectingId = signal<string | null>(null);
  rejectionReason = '';

  ngOnInit() {
    this.loadAllPending();
  }

  loadAllPending() {
    this.loadPendingLeaves();
    this.loadPendingSwaps();
    this.loadPendingAdjustments();
  }

  loadPendingLeaves() {
    this.apiService.get<any>(`${environment.apiBaseUrl}/management/leaves/pending`).subscribe({
      next: (res) => {
        if (res.success) this.leaves.set(res.data);
      }
    });
  }

  loadPendingSwaps() {
    this.apiService.get<any>(`${environment.apiBaseUrl}/management/schedules/swaps/pending`).subscribe({
      next: (res) => {
        if (res.success) this.swaps.set(res.data);
      }
    });
  }

  loadPendingAdjustments() {
    this.apiService.get<any>(`${environment.apiBaseUrl}/management/attendance/adjustments/pending`).subscribe({
      next: (res) => {
        if (res.success) this.adjustments.set(res.data);
      }
    });
  }

  approveLeave(id: string, status: string) {
    this.apiService.post<any, any>(`${environment.apiBaseUrl}/management/leaves/${id}/approve`, null, {
      params: { status }
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success(status === 'APPROVED' ? 'Đã phê duyệt nghỉ phép.' : 'Đã từ chối nghỉ phép.');
          this.loadPendingLeaves();
        }
      }
    });
  }

  approveSwap(id: string, status: string) {
    this.apiService.post<any, any>(`${environment.apiBaseUrl}/management/schedules/swaps/${id}/approve`, null, {
      params: { status }
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success(status === 'APPROVED' ? 'Đã phê duyệt đổi ca.' : 'Đã từ chối đổi ca.');
          this.loadPendingSwaps();
        }
      }
    });
  }

  approveAdjust(id: string, status: string) {
    this.apiService.post<any, any>(`${environment.apiBaseUrl}/management/attendance/adjustments/${id}/approve`, null, {
      params: { status }
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Đã phê duyệt điều chỉnh công.');
          this.loadPendingAdjustments();
        }
      }
    });
  }

  openRejectDialog(id: string) {
    this.rejectingId.set(id);
    this.rejectionReason = '';
    this.rejectModalOpen.set(true);
  }

  closeRejectDialog() {
    this.rejectModalOpen.set(false);
  }

  rejectAdjust() {
    const id = this.rejectingId();
    if (!id || !this.rejectionReason) {
      this.toastService.error('Vui lòng nhập lý do từ chối.');
      return;
    }

    this.apiService.post<any, any>(`${environment.apiBaseUrl}/management/attendance/adjustments/${id}/approve`, null, {
      params: { 
        status: 'REJECTED',
        rejectionReason: this.rejectionReason 
      }
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Đã từ chối điều chỉnh công.');
          this.rejectModalOpen.set(false);
          this.loadPendingAdjustments();
        }
      }
    });
  }
}
