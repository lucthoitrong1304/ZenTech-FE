import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import { ApprovalDecision, ApprovalResponse, AttendanceAdjustmentApproval, LeaveRequestApproval, ShiftSwapApproval } from '../models/approval.models';

@Injectable({ providedIn: 'root' })
export class ApprovalService {
  private readonly api = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/management`;

  getPendingLeaves(): Observable<ApprovalResponse<LeaveRequestApproval[]>> {
    return this.api.get<ApprovalResponse<LeaveRequestApproval[]>>(`${this.baseUrl}/leaves/pending`);
  }

  getPendingSwaps(): Observable<ApprovalResponse<ShiftSwapApproval[]>> {
    return this.api.get<ApprovalResponse<ShiftSwapApproval[]>>(`${this.baseUrl}/schedules/swaps/pending`);
  }

  getPendingAdjustments(): Observable<ApprovalResponse<AttendanceAdjustmentApproval[]>> {
    return this.api.get<ApprovalResponse<AttendanceAdjustmentApproval[]>>(`${this.baseUrl}/attendance/adjustments/pending`);
  }

  decideLeave(id: string, status: ApprovalDecision): Observable<ApprovalResponse<LeaveRequestApproval>> {
    return this.api.post<null, ApprovalResponse<LeaveRequestApproval>>(`${this.baseUrl}/leaves/${id}/approve`, null, { params: { status } });
  }

  decideSwap(id: string, status: ApprovalDecision): Observable<ApprovalResponse<ShiftSwapApproval>> {
    return this.api.post<null, ApprovalResponse<ShiftSwapApproval>>(`${this.baseUrl}/schedules/swaps/${id}/approve`, null, { params: { status } });
  }

  decideAdjustment(id: string, status: ApprovalDecision): Observable<ApprovalResponse<AttendanceAdjustmentApproval>> {
    return this.api.post<null, ApprovalResponse<AttendanceAdjustmentApproval>>(`${this.baseUrl}/attendance/adjustments/${id}/approve`, null, { params: { status } });
  }
}
