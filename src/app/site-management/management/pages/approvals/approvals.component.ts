import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { LucideCheck, LucideRefreshCw, LucideX } from '@lucide/angular';

type LeaveTypeUnit = 'DAY' | 'HOUR';

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
  employee: { fullName: string };
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  amount: number;
  leaveType: LeaveType | null;
  reason: string;
  status: string;
}

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, LucideRefreshCw, LucideCheck, LucideX],
  templateUrl: './approvals.component.html',
  styleUrl: './approvals.component.css'
})
export class ApprovalsComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly toastService = inject(ToastService);

  leaves = signal<LeaveRequest[]>([]);

  ngOnInit(): void {
    this.loadPendingLeaves();
  }

  loadPendingLeaves(): void {
    this.apiService.get<ApiResponse<LeaveRequest[]>>(`${environment.apiBaseUrl}/management/leaves/pending`).subscribe({
      next: response => {
        if (response.success) this.leaves.set(response.data);
      }
    });
  }

  approveLeave(id: string, status: 'APPROVED' | 'REJECTED'): void {
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

  requestTimeLabel(request: LeaveRequest): string {
    if (request.leaveType?.unit === 'HOUR') {
      return `${request.startDate} · ${this.shortTime(request.startTime)} - ${this.shortTime(request.endTime)} · ${request.amount} giờ`;
    }
    return `${request.startDate} -> ${request.endDate} · ${request.amount} ngày`;
  }

  private shortTime(value: string | null): string {
    return value ? value.slice(0, 5) : '--:--';
  }
}
