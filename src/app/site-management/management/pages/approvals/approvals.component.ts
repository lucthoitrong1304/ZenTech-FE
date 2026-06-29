import { Component, ChangeDetectionStrategy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { LucideCheck, LucideRefreshCw, LucideX } from '@lucide/angular';
import { PermissionService } from '../../../../core/permissions/permission.service';
import { PermissionCode } from '../../../../core/permissions/permission.models';

type LeaveTypeUnit = 'DAY' | 'HOUR';
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string | null;
}

interface LeaveType {
  id: string;
  name: string;
  unit: LeaveTypeUnit;
}

interface LeaveRequest {
  id: string;
  employee: { fullName: string; email: string };
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  amount: number;
  leaveType: LeaveType | null;
  reason: string;
  status: string;
  targetShifts?: { id: string; name: string }[] | null;
}

interface ShiftSwapRequest {
  id: string;
  requester: { fullName: string; email: string };
  targetEmployee: { fullName: string; email: string };
  workDate: string;
  shift: { name: string } | null;
  targetWorkDate: string | null;
  targetShift: { name: string } | null;
  type: 'SWAP' | 'COVER';
  reason: string;
  status: ApprovalStatus;
  requestedAt: string;
}

interface AttendanceAdjustment {
  id: string;
  employee: { fullName: string; email: string };
  workDate: string;
  type: string;
  proposedTime: string;
  reason: string;
  status: ApprovalStatus;
  requestedAt: string;
}

@Component({
  selector: 'app-approvals',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, LucideRefreshCw, LucideCheck, LucideX],
  templateUrl: './approvals.component.html',
  styleUrl: './approvals.component.css'
})
export class ApprovalsComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly toastService = inject(ToastService);
  private readonly permissionService = inject(PermissionService);
  protected readonly canApprove = computed(() => this.permissionService.has(PermissionCode.APPROVAL_APPROVE));

  activeTab = signal<'leave' | 'swap' | 'adjust'>('leave');
  loading = signal(false);

  leaves = signal<LeaveRequest[]>([]);
  swaps = signal<ShiftSwapRequest[]>([]);
  adjustments = signal<AttendanceAdjustment[]>([]);

  ngOnInit(): void {
    this.loadAllPending();
  }

  loadAllPending(): void {
    this.loading.set(true);
    this.loadPendingLeaves();
    this.loadPendingSwaps();
    this.loadPendingAdjustments();
  }

  loadPendingLeaves(): void {
    this.apiService.get<ApiResponse<LeaveRequest[]>>(`${environment.apiBaseUrl}/management/leaves/pending`).subscribe({
      next: response => {
        if (response.success) this.leaves.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadPendingSwaps(): void {
    this.apiService.get<ApiResponse<ShiftSwapRequest[]>>(`${environment.apiBaseUrl}/management/schedules/swaps/pending`).subscribe({
      next: response => {
        if (response.success) this.swaps.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadPendingAdjustments(): void {
    this.apiService.get<ApiResponse<AttendanceAdjustment[]>>(`${environment.apiBaseUrl}/management/attendance/adjustments/pending`).subscribe({
      next: response => {
        if (response.success) this.adjustments.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  approveLeave(id: string, status: 'APPROVED' | 'REJECTED'): void {
    if (!this.canApprove()) {
      this.toastService.error('Không có quyền thực hiện thao tác này.');
      return;
    }

    this.apiService.post<null, ApiResponse<LeaveRequest>>(`${environment.apiBaseUrl}/management/leaves/${id}/approve`, null, {
      params: { status }
    }).subscribe({
      next: response => {
        if (response.success) {
          this.toastService.success(status === 'APPROVED' ? 'Đã phê duyệt yêu cầu.' : 'Đã từ chối yêu cầu.');
          this.loadPendingLeaves();
        }
      },
      error: error => this.toastService.error(error.error?.message || 'Cập nhật yêu cầu thất bại.')
    });
  }

  approveSwap(id: string, status: 'APPROVED' | 'REJECTED'): void {
    if (!this.canApprove()) {
      this.toastService.error('Không có quyền thực hiện thao tác này.');
      return;
    }

    this.apiService.post<null, ApiResponse<any>>(`${environment.apiBaseUrl}/management/schedules/swaps/${id}/approve`, null, {
      params: { status }
    }).subscribe({
      next: response => {
        if (response.success) {
          this.toastService.success(status === 'APPROVED' ? 'Đã duyệt đổi ca.' : 'Đã từ chối đổi ca.');
          this.loadPendingSwaps();
        }
      },
      error: error => this.toastService.error(error.error?.message || 'Duyệt đổi ca thất bại.')
    });
  }

  approveAdjustment(id: string, status: 'APPROVED' | 'REJECTED'): void {
    if (!this.canApprove()) {
      this.toastService.error('Không có quyền thực hiện thao tác này.');
      return;
    }

    this.apiService.post<null, ApiResponse<any>>(`${environment.apiBaseUrl}/management/attendance/adjustments/${id}/approve`, null, {
      params: { status }
    }).subscribe({
      next: response => {
        if (response.success) {
          this.toastService.success(status === 'APPROVED' ? 'Đã duyệt chỉnh công.' : 'Đã từ chối chỉnh công.');
          this.loadPendingAdjustments();
        }
      },
      error: error => this.toastService.error(error.error?.message || 'Duyệt chỉnh công thất bại.')
    });
  }

  switchTab(tab: 'leave' | 'swap' | 'adjust'): void {
    this.activeTab.set(tab);
  }

  requestTimeLabel(request: LeaveRequest): string {
    let text = '';
    if (request.leaveType?.unit === 'HOUR') {
      text = `${request.startDate} · ${this.shortTime(request.startTime)} - ${this.shortTime(request.endTime)} · ${request.amount} giờ`;
    } else {
      text = `${request.startDate} -> ${request.endDate} · ${request.amount} ngày`;
    }
    if (request.targetShifts && request.targetShifts.length > 0) {
      const shiftsText = request.targetShifts.map(s => s.name).join(', ');
      text += ` (${shiftsText})`;
    }
    return text;
  }

  getAdjustmentTypeLabel(type: string): string {
    switch (type) {
      case 'FORGOT_CHECK_IN': return 'Quên check-in';
      case 'FORGOT_CHECK_OUT': return 'Quên check-out';
      case 'DEVICE_ERROR': return 'Lỗi máy chấm công';
      case 'EDIT_TIME': return 'Điều chỉnh giờ';
      default: return type;
    }
  }

  formatSwapSubtitle(request: ShiftSwapRequest): string {
    const typeLabel = request.type === 'SWAP' ? 'Đổi ca' : 'Trực thay';
    if (request.type === 'SWAP') {
      return `${typeLabel}: Ca của ${request.requester.fullName} (${request.workDate} · ${request.shift?.name || 'Kỳ ca'}) ⇄ Ca của ${request.targetEmployee.fullName} (${request.targetWorkDate} · ${request.targetShift?.name || 'Kỳ ca'})`;
    }
    return `${typeLabel}: Ca của ${request.requester.fullName} (${request.workDate} · ${request.shift?.name || 'Kỳ ca'}) ⇄ đồng nghiệp ${request.targetEmployee.fullName} trực giúp`;
  }

  shortTime(value: string | null): string {
    return value ? value.slice(0, 5) : '--:--';
  }
}
