import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { LucideFileText, LucideCalendarClock, LucideFileEdit, LucideLoader2 } from '@lucide/angular';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface EmployeeSummary {
  id: string;
  fullName: string;
}

@Component({
  selector: 'app-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideFileText, LucideCalendarClock, LucideFileEdit, LucideLoader2],
  templateUrl: './requests.component.html',
  styleUrl: './requests.component.css'
})
export class RequestsComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly toastService = inject(ToastService);

  activeTab = signal<'leave' | 'swap' | 'adjust'>('leave');
  submitting = signal(false);

  shifts = signal<Shift[]>([]);
  employees = signal<EmployeeSummary[]>([]);

  // User's request history signals
  myLeaves = signal<any[]>([]);
  mySwaps = signal<any[]>([]);
  myAdjustments = signal<any[]>([]);

  leaveData = {
    startDate: '',
    endDate: '',
    leaveType: 'PAID',
    reason: ''
  };

  swapData = {
    type: 'COVER',
    workDate: '',
    shiftId: '',
    targetEmployeeId: '',
    targetWorkDate: '',
    targetShiftId: '',
    reason: ''
  };

  adjustData = {
    workDate: '',
    type: 'FORGOT_CHECK_IN',
    proposedTime: '',
    reason: ''
  };

  // Context-aware history computed property
  myRequestsHistory = computed(() => {
    const tab = this.activeTab();
    if (tab === 'leave') {
      return this.myLeaves().map(r => ({
        id: r.id,
        title: r.leaveType === 'PAID' ? 'Nghỉ phép có lương' : r.leaveType === 'UNPAID' ? 'Nghỉ không lương' : 'Nghỉ ốm (BHXH)',
        subtitle: `${r.startDate} đến ${r.endDate}`,
        reason: r.reason,
        status: r.status,
        rejectionReason: r.rejectionReason,
        requestedAt: r.requestedAt
      }));
    } else if (tab === 'swap') {
      return this.mySwaps().map(r => ({
        id: r.id,
        title: r.type === 'SWAP' ? 'Đổi ca chéo' : 'Nhờ làm thay ca',
        subtitle: `${r.workDate} · ${r.shift?.name || 'Ca gốc'}`,
        reason: r.reason,
        status: r.status,
        rejectionReason: r.rejectionReason,
        requestedAt: r.requestedAt
      }));
    } else {
      return this.myAdjustments().map(r => ({
        id: r.id,
        title: r.type === 'FORGOT_CHECK_IN' ? 'Quên check-in' : r.type === 'FORGOT_CHECK_OUT' ? 'Quên check-out' : r.type === 'DEVICE_ERROR' ? 'Lỗi thiết bị' : 'Sửa giờ công',
        subtitle: `${r.workDate} · Giờ đề xuất: ${r.proposedTime.slice(0, 5)}`,
        reason: r.reason,
        status: r.status,
        rejectionReason: r.rejectionReason,
        requestedAt: r.requestedAt
      }));
    }
  });

  ngOnInit() {
    this.loadShifts();
    this.loadEmployees();
    this.loadMyHistory();
  }

  loadShifts() {
    this.apiService.get<any>(`${environment.apiBaseUrl}/shifts`).subscribe({
      next: (res) => {
        if (res.success) {
          this.shifts.set(res.data);
          if (res.data.length > 0) {
            this.swapData.shiftId = res.data[0].id;
            this.swapData.targetShiftId = res.data[0].id;
          }
        }
      }
    });
  }

  loadEmployees() {
    this.apiService.get<any>(`${environment.apiBaseUrl}/management/employees`, {
      params: { size: '100', active: 'true' }
    }).subscribe({
      next: (res) => {
        if (res.success && res.data?.content) {
          this.employees.set(res.data.content);
          if (res.data.content.length > 0) {
            this.swapData.targetEmployeeId = res.data.content[0].id;
          }
        }
      }
    });
  }

  // Load employee's request histories
  loadMyHistory() {
    this.loadMyLeaves();
    this.loadMySwaps();
    this.loadMyAdjustments();
  }

  loadMyLeaves() {
    this.apiService.get<any>(`${environment.apiBaseUrl}/leaves/my`).subscribe({
      next: (res) => {
        if (res.success) this.myLeaves.set(res.data);
      }
    });
  }

  loadMySwaps() {
    this.apiService.get<any>(`${environment.apiBaseUrl}/schedules/swaps/my`).subscribe({
      next: (res) => {
        if (res.success) this.mySwaps.set(res.data);
      }
    });
  }

  loadMyAdjustments() {
    this.apiService.get<any>(`${environment.apiBaseUrl}/attendance/adjustments/my`).subscribe({
      next: (res) => {
        if (res.success) this.myAdjustments.set(res.data);
      }
    });
  }

  submitLeave() {
    if (!this.leaveData.startDate || !this.leaveData.endDate || !this.leaveData.reason) {
      this.toastService.error('Vui lòng điền đầy đủ các trường.');
      return;
    }
    this.submitting.set(true);
    this.apiService.post<any, any>(`${environment.apiBaseUrl}/leaves`, this.leaveData).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Đã gửi yêu cầu nghỉ phép.');
          this.leaveData.reason = '';
          this.loadMyLeaves(); // Reload history
        }
        this.submitting.set(false);
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Gửi yêu cầu thất bại.');
        this.submitting.set(false);
      }
    });
  }

  submitSwap() {
    if (!this.swapData.workDate || !this.swapData.reason) {
      this.toastService.error('Vui lòng điền đầy đủ các trường.');
      return;
    }
    this.submitting.set(true);

    const payload: any = {
      type: this.swapData.type,
      workDate: this.swapData.workDate,
      shift: { id: this.swapData.shiftId },
      targetEmployee: { id: this.swapData.targetEmployeeId },
      reason: this.swapData.reason
    };

    if (this.swapData.type === 'SWAP') {
      if (!this.swapData.targetWorkDate) {
        this.toastService.error('Vui lòng điền ngày nhận lại ca.');
        this.submitting.set(false);
        return;
      }
      payload.targetWorkDate = this.swapData.targetWorkDate;
      payload.targetShift = { id: this.swapData.targetShiftId };
    }

    this.apiService.post<any, any>(`${environment.apiBaseUrl}/schedules/swaps`, payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Đã gửi yêu cầu đổi ca.');
          this.swapData.reason = '';
          this.loadMySwaps(); // Reload history
        }
        this.submitting.set(false);
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Gửi yêu cầu thất bại.');
        this.submitting.set(false);
      }
    });
  }

  submitAdjust() {
    if (!this.adjustData.workDate || !this.adjustData.proposedTime || !this.adjustData.reason) {
      this.toastService.error('Vui lòng điền đầy đủ các trường.');
      return;
    }
    this.submitting.set(true);
    
    // Ensure proposedTime is formatted as HH:mm:00
    const timeFormatted = this.adjustData.proposedTime.length === 5 
        ? `${this.adjustData.proposedTime}:00` 
        : this.adjustData.proposedTime;

    const payload = {
      ...this.adjustData,
      proposedTime: timeFormatted
    };

    this.apiService.post<any, any>(`${environment.apiBaseUrl}/attendance/adjustments`, payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Đã gửi yêu cầu chỉnh công.');
          this.adjustData.reason = '';
          this.adjustData.proposedTime = '';
          this.loadMyAdjustments(); // Reload history
        }
        this.submitting.set(false);
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Gửi yêu cầu thất bại.');
        this.submitting.set(false);
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-700';
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'REJECTED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'APPROVED': return 'Đã duyệt';
      case 'PENDING': return 'Đang chờ';
      case 'REJECTED': return 'Từ chối';
      default: return status;
    }
  }
}
