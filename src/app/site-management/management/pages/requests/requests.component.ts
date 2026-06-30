import { Component, ChangeDetectionStrategy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { LucideLoader2 } from '@lucide/angular';
import { ConfirmService } from '../../../../shared/components/confirm/confirm.service';

type LeaveTypeUnit = 'DAY' | 'HOUR';
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCEL_PENDING' | 'CANCELLED';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string | null;
}

interface LeaveType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: LeaveTypeUnit;
  active: boolean;
  systemDefault: boolean;
  sortOrder: number;
}

interface LeaveQuota {
  employeeId: string;
  leaveTypeId: string;
  leaveType: LeaveType;
  year: number;
  entitlement: number;
  approvedUsed: number;
  pendingUsed: number;
  remaining: number;
}

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  leaveType: LeaveType | null;
  amount: number;
  reason: string;
  status: ApprovalStatus;
  requestedAt: string;
  targetShifts?: { id: string; name: string }[] | null;
}

interface ShiftDto {
  employeeShiftId: string;
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  colorCode: string;
  shiftType: string;
  workDate: string;
}

interface ShiftSwapRequest {
  id: string;
  requester: { fullName: string };
  targetEmployee: { fullName: string };
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
  employee: { fullName: string };
  workDate: string;
  type: string;
  proposedTime: string;
  reason: string;
  status: ApprovalStatus;
  requestedAt: string;
}

@Component({
  selector: 'app-requests',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, LucideLoader2],
  templateUrl: './requests.component.html',
  styleUrl: './requests.component.css'
})
export class RequestsComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  // activeTab state
  activeTab = signal<'leave' | 'swap' | 'adjust'>('leave');
  submitting = signal(false);

  // Leave Form state
  leaveTypes = signal<LeaveType[]>([]);
  quotas = signal<LeaveQuota[]>([]);
  myDailyShifts = signal<ShiftDto[]>([]);
  selectedShiftIds = signal<string[]>([]);

  leaveTypeId = signal('');
  startDate = signal('');
  endDate = signal('');
  startTime = signal('');
  endTime = signal('');
  reason = signal('');

  selectedType = computed(() => this.leaveTypes().find(type => type.id === this.leaveTypeId()) ?? null);
  selectedQuota = computed(() => this.quotas().find(quota => quota.leaveTypeId === this.leaveTypeId()) ?? null);
  isHourType = computed(() => this.selectedType()?.unit === 'HOUR');

  // Shift Swap Form state
  colleagues = signal<any[]>([]);
  mySwapShifts = signal<ShiftDto[]>([]);
  colleagueShifts = signal<ShiftDto[]>([]);

  swapData = {
    colleagueId: '',
    type: 'SWAP' as 'SWAP' | 'COVER',
    myWorkDate: '',
    myShiftId: '',
    colleagueWorkDate: '',
    colleagueShiftId: '',
    reason: ''
  };

  // Attendance Adjustment Form state
  adjustData = {
    workDate: '',
    type: 'FORGOT_CHECK_IN',
    proposedTime: '',
    reason: ''
  };

  // Histories state
  myLeaves = signal<LeaveRequest[]>([]);
  mySwaps = signal<ShiftSwapRequest[]>([]);
  myAdjustments = signal<AttendanceAdjustment[]>([]);

  ngOnInit(): void {
    this.loadLeaveTypes();
    this.loadMyQuotas();
    this.loadHistories();
    this.loadColleagues();
  }

  loadHistories(): void {
    this.loadMyLeaves();
    this.loadMySwaps();
    this.loadMyAdjustments();
  }

  // --- Leave / WFH / AFK Logic ---
  loadLeaveTypes(): void {
    this.apiService.get<ApiResponse<LeaveType[]>>(`${environment.apiBaseUrl}/leave-types`).subscribe({
      next: response => {
        if (!response.success) return;
        this.leaveTypes.set(response.data);
        if (!this.leaveTypeId() && response.data.length > 0) {
          this.leaveTypeId.set(response.data[0].id);
        }
      },
      error: () => this.toastService.error('Không tải được danh sách loại phép.')
    });
  }

  loadMyQuotas(): void {
    this.apiService.get<ApiResponse<LeaveQuota[]>>(`${environment.apiBaseUrl}/leaves/my/quotas`).subscribe({
      next: response => {
        if (response.success) this.quotas.set(response.data);
      }
    });
  }

  loadMyLeaves(): void {
    this.apiService.get<ApiResponse<LeaveRequest[]>>(`${environment.apiBaseUrl}/leaves/my`).subscribe({
      next: response => {
        if (response.success) this.myLeaves.set(response.data);
      }
    });
  }

  onLeaveDateChange(): void {
    if (this.startDate() && this.startDate() === this.endDate()) {
      this.loadMyDailyShifts(this.startDate());
    } else {
      this.myDailyShifts.set([]);
      this.selectedShiftIds.set([]);
    }
  }

  loadMyDailyShifts(date: string): void {
    this.apiService.get<ApiResponse<ShiftDto[]>>(`${environment.apiBaseUrl}/shifts/my-schedules?startDate=${date}&endDate=${date}`).subscribe({
      next: response => {
        if (response.success) {
          this.myDailyShifts.set(response.data);
          this.selectedShiftIds.set([]); // clear selections
        }
      }
    });
  }

  toggleShiftSelection(shiftId: string): void {
    this.selectedShiftIds.update(ids => {
      if (ids.includes(shiftId)) {
        return ids.filter(id => id !== shiftId);
      } else {
        return [...ids, shiftId];
      }
    });
  }

  submitLeave(): void {
    const selectedType = this.selectedType();
    if (!selectedType) {
      this.toastService.error('Vui lòng chọn loại phép.');
      return;
    }
    if (!this.startDate() || !this.endDate() || !this.reason().trim()) {
      this.toastService.error('Vui lòng điền đầy đủ ngày và lý do.');
      return;
    }
    if (selectedType.unit === 'HOUR' && (!this.startTime() || !this.endTime())) {
      this.toastService.error('Vui lòng nhập giờ bắt đầu và kết thúc.');
      return;
    }

    const payload = {
      leaveTypeId: this.leaveTypeId(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      startTime: selectedType.unit === 'HOUR' ? `${this.startTime()}:00` : null,
      endTime: selectedType.unit === 'HOUR' ? `${this.endTime()}:00` : null,
      shiftIds: this.selectedShiftIds(),
      reason: this.reason().trim()
    };

    this.submitting.set(true);
    this.apiService.post<typeof payload, ApiResponse<LeaveRequest>>(`${environment.apiBaseUrl}/leaves`, payload).subscribe({
      next: response => {
        if (response.success) {
          this.toastService.success('Đã gửi yêu cầu nghỉ.');
          this.reason.set('');
          this.startTime.set('');
          this.endTime.set('');
          this.selectedShiftIds.set([]);
          this.myDailyShifts.set([]);
          this.loadMyLeaves();
          this.loadMyQuotas();
        }
        this.submitting.set(false);
      },
      error: error => {
        this.toastService.error(error.error?.message || 'Gửi yêu cầu thất bại.');
        this.submitting.set(false);
      }
    });
  }

  // --- Shift Swap Logic ---
  loadColleagues(): void {
    // Load colleague directory
    this.apiService.get<ApiResponse<{ content: any[] }>>(`${environment.apiBaseUrl}/management/employees?size=100`).subscribe({
      next: response => {
        if (response.success) {
          this.colleagues.set(response.data.content);
        }
      }
    });
  }

  loadMySwapShifts(): void {
    if (!this.swapData.myWorkDate) return;
    const date = this.swapData.myWorkDate;
    this.apiService.get<ApiResponse<ShiftDto[]>>(`${environment.apiBaseUrl}/shifts/my-schedules?startDate=${date}&endDate=${date}`).subscribe({
      next: response => {
        if (response.success) {
          this.mySwapShifts.set(response.data);
          if (response.data.length > 0) {
            this.swapData.myShiftId = response.data[0].shiftId;
          } else {
            this.swapData.myShiftId = '';
          }
        }
      }
    });
  }

  loadColleagueShifts(): void {
    if (!this.swapData.colleagueId || !this.swapData.colleagueWorkDate) return;
    const date = this.swapData.colleagueWorkDate;

    // To load colleague shifts, we query the weekly schedule with colleague's employeeId
    const selectedColleague = this.colleagues().find(c => c.employeeId === this.swapData.colleagueId);
    if (!selectedColleague) return;

    this.apiService.get<ApiResponse<{ employees: { content: any[] } }>>(`${environment.apiBaseUrl}/shifts/schedules`, {
      params: {
        startDate: date,
        endDate: date,
        employeeId: selectedColleague.employeeId
      }
    }).subscribe({
      next: response => {
        if (response.success) {
          const emp = response.data.employees?.content?.find((e: any) => e.employeeId === selectedColleague.employeeId);
          if (emp && emp.shifts) {
            const mappedShifts: ShiftDto[] = emp.shifts.map((s: any) => ({
              employeeShiftId: s.employeeShiftId,
              shiftId: s.shiftId,
              shiftName: s.shiftName,
              startTime: s.startTime,
              endTime: s.endTime,
              colorCode: s.colorCode,
              shiftType: s.shiftType,
              workDate: s.workDate
            }));
            this.colleagueShifts.set(mappedShifts);
            if (mappedShifts.length > 0) {
              this.swapData.colleagueShiftId = mappedShifts[0].shiftId;
            } else {
              this.swapData.colleagueShiftId = '';
            }
          } else {
            this.colleagueShifts.set([]);
            this.swapData.colleagueShiftId = '';
          }
        }
      }
    });
  }

  loadMySwaps(): void {
    this.apiService.get<ApiResponse<ShiftSwapRequest[]>>(`${environment.apiBaseUrl}/schedules/swaps/my`).subscribe({
      next: response => {
        if (response.success) this.mySwaps.set(response.data);
      }
    });
  }

  submitSwap(): void {
    if (!this.swapData.colleagueId || !this.swapData.reason.trim()) {
      this.toastService.error('Vui lòng nhập đồng nghiệp và lý do.');
      return;
    }
    if (this.swapData.type === 'SWAP' && (!this.swapData.myWorkDate || !this.swapData.myShiftId || !this.swapData.colleagueWorkDate || !this.swapData.colleagueShiftId)) {
      this.toastService.error('Vui lòng chọn đầy đủ ngày ca đổi của bạn và đồng nghiệp.');
      return;
    }
    if (this.swapData.type === 'COVER' && (!this.swapData.myWorkDate || !this.swapData.myShiftId)) {
      this.toastService.error('Vui lòng chọn ca làm việc của bạn cần nhờ trực thay.');
      return;
    }

    const payload = {
      targetEmployee: { id: this.swapData.colleagueId },
      workDate: this.swapData.myWorkDate,
      shift: this.swapData.myShiftId ? { id: this.swapData.myShiftId } : null,
      targetWorkDate: this.swapData.type === 'SWAP' ? this.swapData.colleagueWorkDate : null,
      targetShift: (this.swapData.type === 'SWAP' && this.swapData.colleagueShiftId) ? { id: this.swapData.colleagueShiftId } : null,
      type: this.swapData.type,
      reason: this.swapData.reason.trim(),
      status: 'PENDING'
    };

    this.submitting.set(true);
    this.apiService.post<any, ApiResponse<any>>(`${environment.apiBaseUrl}/schedules/swaps`, payload).subscribe({
      next: response => {
        if (response.success) {
          this.toastService.success('Đã gửi yêu cầu đổi ca.');
          this.swapData.reason = '';
          this.swapData.myWorkDate = '';
          this.swapData.myShiftId = '';
          this.swapData.colleagueWorkDate = '';
          this.swapData.colleagueShiftId = '';
          this.mySwapShifts.set([]);
          this.colleagueShifts.set([]);
          this.loadMySwaps();
        }
        this.submitting.set(false);
      },
      error: error => {
        this.toastService.error(error.error?.message || 'Gửi yêu cầu đổi ca thất bại.');
        this.submitting.set(false);
      }
    });
  }

  // --- Attendance Adjustment Logic ---
  loadMyAdjustments(): void {
    this.apiService.get<ApiResponse<AttendanceAdjustment[]>>(`${environment.apiBaseUrl}/attendance/adjustments/my`).subscribe({
      next: response => {
        if (response.success) this.myAdjustments.set(response.data);
      }
    });
  }

  submitAdjustment(): void {
    if (!this.adjustData.workDate || !this.adjustData.proposedTime || !this.adjustData.reason.trim()) {
      this.toastService.error('Vui lòng nhập ngày, giờ điều chỉnh và lý do.');
      return;
    }

    const payload = {
      workDate: this.adjustData.workDate,
      type: this.adjustData.type,
      proposedTime: `${this.adjustData.proposedTime}:00`,
      reason: this.adjustData.reason.trim(),
      status: 'PENDING'
    };

    this.submitting.set(true);
    this.apiService.post<any, ApiResponse<any>>(`${environment.apiBaseUrl}/attendance/adjustments`, payload).subscribe({
      next: response => {
        if (response.success) {
          this.toastService.success('Đã gửi yêu cầu điều chỉnh công.');
          this.adjustData.reason = '';
          this.adjustData.proposedTime = '';
          this.adjustData.workDate = '';
          this.loadMyAdjustments();
        }
        this.submitting.set(false);
      },
      error: error => {
        this.toastService.error(error.error?.message || 'Gửi yêu cầu chỉnh công thất bại.');
        this.submitting.set(false);
      }
    });
  }

  // Helpers
  switchTab(tab: 'leave' | 'swap' | 'adjust'): void {
    this.activeTab.set(tab);
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'APPROVED': return 'Đã duyệt';
      case 'PENDING': return 'Đang chờ';
      case 'REJECTED': return 'Từ chối';
      case 'CANCELLED': return 'Đã hủy';
      case 'CANCEL_PENDING': return 'Chờ duyệt hủy';
      default: return status;
    }
  }

  cancelLeave(id: string): void {
    this.confirmService.open({
      title: 'Xác nhận hủy yêu cầu',
      content: 'Bạn có chắc chắn muốn hủy yêu cầu nghỉ này?'
    }).subscribe(accept => {
      if (accept) {
        this.apiService.post<null, ApiResponse<any>>(`${environment.apiBaseUrl}/leaves/${id}/cancel`, null).subscribe({
          next: response => {
            if (response.success) {
              this.toastService.success('Đã gửi yêu cầu hủy.');
              this.loadMyLeaves();
              this.loadMyQuotas();
            }
          },
          error: error => this.toastService.error(error.error?.message || 'Hủy yêu cầu thất bại.')
        });
      }
    });
  }

  cancelSwap(id: string): void {
    this.confirmService.open({
      title: 'Xác nhận hủy yêu cầu',
      content: 'Bạn có chắc chắn muốn hủy yêu cầu đổi ca này?'
    }).subscribe(accept => {
      if (accept) {
        this.apiService.post<null, ApiResponse<any>>(`${environment.apiBaseUrl}/schedules/swaps/${id}/cancel`, null).subscribe({
          next: response => {
            if (response.success) {
              this.toastService.success('Đã gửi yêu cầu hủy.');
              this.loadMySwaps();
            }
          },
          error: error => this.toastService.error(error.error?.message || 'Hủy yêu cầu thất bại.')
        });
      }
    });
  }

  cancelAdjustment(id: string): void {
    this.confirmService.open({
      title: 'Xác nhận hủy yêu cầu',
      content: 'Bạn có chắc chắn muốn hủy yêu cầu chỉnh công này?'
    }).subscribe(accept => {
      if (accept) {
        this.apiService.post<null, ApiResponse<any>>(`${environment.apiBaseUrl}/attendance/adjustments/${id}/cancel`, null).subscribe({
          next: response => {
            if (response.success) {
              this.toastService.success('Đã gửi yêu cầu hủy.');
              this.loadMyAdjustments();
            }
          },
          error: error => this.toastService.error(error.error?.message || 'Hủy yêu cầu thất bại.')
        });
      }
    });
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

  unitLabel(unit: LeaveTypeUnit | undefined): string {
    return unit === 'HOUR' ? 'giờ' : 'ngày';
  }

  formatLeaveSubtitle(request: LeaveRequest): string {
    let text = '';
    if (request.leaveType?.unit === 'HOUR') {
      text = `${request.startDate} · ${this.shortTime(request.startTime)} - ${this.shortTime(request.endTime)} · ${request.amount} giờ`;
    } else {
      text = `${request.startDate} đến ${request.endDate} · ${request.amount} ngày`;
    }
    if (request.targetShifts && request.targetShifts.length > 0) {
      const shiftsText = request.targetShifts.map(s => s.name).join(', ');
      text += ` (${shiftsText})`;
    }
    return text;
  }

  formatSwapSubtitle(request: ShiftSwapRequest): string {
    const typeLabel = request.type === 'SWAP' ? 'Đổi ca' : 'Trực thay';
    if (request.type === 'SWAP') {
      return `${typeLabel}: Ca của bạn (${request.workDate} · ${request.shift?.name || 'Kỳ ca'}) ⇄ Colleague (${request.targetWorkDate} · ${request.targetShift?.name || 'Kỳ ca'})`;
    }
    return `${typeLabel}: Ca của bạn (${request.workDate} · ${request.shift?.name || 'Kỳ ca'}) ⇄ đồng nghiệp ${request.targetEmployee.fullName} trực giúp`;
  }

  formatAdjustSubtitle(request: AttendanceAdjustment): string {
    return `${request.workDate} · Đề xuất giờ: ${this.shortTime(request.proposedTime)} · Loại: ${this.getAdjustmentTypeLabel(request.type)}`;
  }

  private shortTime(value: string | null): string {
    return value ? value.slice(0, 5) : '--:--';
  }
}
