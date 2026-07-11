import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { LucideCheck, LucideRefreshCw, LucideX } from '@lucide/angular';
import { PermissionCode } from '@/core/permissions/permission.models';
import { PermissionService } from '@/core/permissions/permission.service';
import { ToastService } from '@/shared/components/toast/toast.service';
import { ApprovalDecision, ApprovalTab, LeaveRequestApproval, ShiftSwapApproval } from '@/site-management/management/approvals/data-access/models/approval.models';
import { ApprovalStore } from '@/site-management/management/approvals/data-access/store/approval.store';

@Component({
  selector: 'app-approvals',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, LucideRefreshCw, LucideCheck, LucideX],
  providers: [ApprovalStore],
  templateUrl: './approvals-page.component.html',
  styleUrl: './approvals-page.component.css',
})
export class ApprovalsComponent implements OnInit {
  private readonly store = inject(ApprovalStore);
  private readonly toastService = inject(ToastService);
  private readonly permissionService = inject(PermissionService);

  protected readonly canApprove = computed(() => this.permissionService.has(PermissionCode.APPROVAL_APPROVE));
  protected readonly activeTab = signal<ApprovalTab>('leave');
  protected readonly loading = this.store.loading;
  protected readonly leaves = this.store.leaves;
  protected readonly swaps = this.store.swaps;
  protected readonly adjustments = this.store.adjustments;

  ngOnInit(): void {
    this.store.load();
  }

  protected loadAllPending(): void {
    this.store.load();
  }

  protected approveLeave(id: string, status: ApprovalDecision): void {
    if (!this.ensurePermission()) return;
    this.store.decideLeave({ id, status });
  }

  protected approveSwap(id: string, status: ApprovalDecision): void {
    if (!this.ensurePermission()) return;
    this.store.decideSwap({ id, status });
  }

  protected approveAdjustment(id: string, status: ApprovalDecision): void {
    if (!this.ensurePermission()) return;
    this.store.decideAdjustment({ id, status });
  }

  protected switchTab(tab: ApprovalTab): void {
    this.activeTab.set(tab);
  }

  protected requestTimeLabel(request: LeaveRequestApproval): string {
    const time = request.leaveType?.unit === 'HOUR'
      ? `${request.startDate} · ${this.shortTime(request.startTime)} - ${this.shortTime(request.endTime)} · ${request.amount} giờ`
      : `${request.startDate} → ${request.endDate} · ${request.amount} ngày`;
    const shifts = request.targetShifts?.map((shift) => shift.name).join(', ');
    return shifts ? `${time} (${shifts})` : time;
  }

  protected getAdjustmentTypeLabel(type: string): string {
    return ({ FORGOT_CHECK_IN: 'Quên check-in', FORGOT_CHECK_OUT: 'Quên check-out', DEVICE_ERROR: 'Lỗi máy chấm công', EDIT_TIME: 'Điều chỉnh giờ' } as Record<string, string>)[type] ?? type;
  }

  protected formatSwapSubtitle(request: ShiftSwapApproval): string {
    const kind = request.type === 'SWAP' ? 'Đổi ca' : 'Trực thay';
    return request.type === 'SWAP'
      ? `${kind}: Ca của ${request.requester.fullName} (${request.workDate} · ${request.shift?.name || 'Kỳ ca'}) ⇄ Ca của ${request.targetEmployee.fullName} (${request.targetWorkDate} · ${request.targetShift?.name || 'Kỳ ca'})`
      : `${kind}: Ca của ${request.requester.fullName} (${request.workDate} · ${request.shift?.name || 'Kỳ ca'}) ⇄ đồng nghiệp ${request.targetEmployee.fullName} trực giúp`;
  }

  protected shortTime(value: string | null): string {
    return value ? value.slice(0, 5) : '--:--';
  }

  private ensurePermission(): boolean {
    if (this.canApprove()) return true;
    this.toastService.error('Không có quyền thực hiện thao tác này.');
    return false;
  }
}
