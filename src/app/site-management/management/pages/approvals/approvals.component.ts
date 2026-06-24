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
  templateUrl: './approvals.component.html',
  styleUrl: './approvals.component.css'
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
