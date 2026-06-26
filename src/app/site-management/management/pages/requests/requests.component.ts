import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { LucideLoader2 } from '@lucide/angular';

type LeaveTypeUnit = 'DAY' | 'HOUR';
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

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
}

@Component({
  selector: 'app-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideLoader2],
  templateUrl: './requests.component.html',
  styleUrl: './requests.component.css'
})
export class RequestsComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly toastService = inject(ToastService);

  submitting = signal(false);
  leaveTypes = signal<LeaveType[]>([]);
  quotas = signal<LeaveQuota[]>([]);
  myLeaves = signal<LeaveRequest[]>([]);

  leaveData = {
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    reason: ''
  };

  selectedType = computed(() => this.leaveTypes().find(type => type.id === this.leaveData.leaveTypeId) ?? null);
  selectedQuota = computed(() => this.quotas().find(quota => quota.leaveTypeId === this.leaveData.leaveTypeId) ?? null);
  isHourType = computed(() => this.selectedType()?.unit === 'HOUR');

  myRequestsHistory = computed(() =>
    this.myLeaves().map(request => ({
      id: request.id,
      title: request.leaveType?.name ?? 'Yêu cầu',
      subtitle: this.formatRequestSubtitle(request),
      reason: request.reason,
      status: request.status,
      requestedAt: request.requestedAt
    }))
  );

  ngOnInit(): void {
    this.loadLeaveTypes();
    this.loadMyQuotas();
    this.loadMyLeaves();
  }

  loadLeaveTypes(): void {
    this.apiService.get<ApiResponse<LeaveType[]>>(`${environment.apiBaseUrl}/leave-types`).subscribe({
      next: response => {
        if (!response.success) return;
        this.leaveTypes.set(response.data);
        if (!this.leaveData.leaveTypeId && response.data.length > 0) {
          this.leaveData.leaveTypeId = response.data[0].id;
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

  submitLeave(): void {
    const selectedType = this.selectedType();
    if (!selectedType) {
      this.toastService.error('Vui lòng chọn loại phép.');
      return;
    }
    if (!this.leaveData.startDate || !this.leaveData.endDate || !this.leaveData.reason.trim()) {
      this.toastService.error('Vui lòng điền đầy đủ ngày và lý do.');
      return;
    }
    if (selectedType.unit === 'HOUR' && (!this.leaveData.startTime || !this.leaveData.endTime)) {
      this.toastService.error('Vui lòng nhập giờ bắt đầu và kết thúc.');
      return;
    }

    const payload = {
      leaveTypeId: this.leaveData.leaveTypeId,
      startDate: this.leaveData.startDate,
      endDate: this.leaveData.endDate,
      startTime: selectedType.unit === 'HOUR' ? `${this.leaveData.startTime}:00` : null,
      endTime: selectedType.unit === 'HOUR' ? `${this.leaveData.endTime}:00` : null,
      reason: this.leaveData.reason.trim()
    };

    this.submitting.set(true);
    this.apiService.post<typeof payload, ApiResponse<LeaveRequest>>(`${environment.apiBaseUrl}/leaves`, payload).subscribe({
      next: response => {
        if (response.success) {
          this.toastService.success('Đã gửi yêu cầu.');
          this.leaveData.reason = '';
          this.leaveData.startTime = '';
          this.leaveData.endTime = '';
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

  getStatusLabel(status: string): string {
    switch (status) {
      case 'APPROVED': return 'Đã duyệt';
      case 'PENDING': return 'Đang chờ';
      case 'REJECTED': return 'Từ chối';
      default: return status;
    }
  }

  unitLabel(unit: LeaveTypeUnit | undefined): string {
    return unit === 'HOUR' ? 'giờ' : 'ngày';
  }

  private formatRequestSubtitle(request: LeaveRequest): string {
    if (request.leaveType?.unit === 'HOUR') {
      return `${request.startDate} · ${this.shortTime(request.startTime)} - ${this.shortTime(request.endTime)} · ${request.amount} giờ`;
    }
    return `${request.startDate} đến ${request.endDate} · ${request.amount} ngày`;
  }

  private shortTime(value: string | null): string {
    return value ? value.slice(0, 5) : '--:--';
  }
}
