import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideLoader2 } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from '@/shared/components/confirm/confirm.service';
import { ToastService } from '@/shared/components/toast/toast.service';
import {
  ApprovalStatus,
  AttendanceAdjustment,
  AttendanceAdjustmentType,
  CreateLeaveRequest,
  CreateSwapRequest,
  LeaveRequest,
  LeaveType,
  ShiftDto,
  ShiftSwapRequest,
  SwapRequestType,
} from '@/site-management/management/requests/data-access/models/requests.models';
import { RequestsService } from '@/site-management/management/requests/data-access/services/requests.service';
import { RequestsStore } from '@/site-management/management/requests/data-access/store/requests.store';

type RequestsTab = 'leave' | 'swap' | 'adjust';

@Component({
  selector: 'app-requests',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, LucideLoader2],
  templateUrl: './requests-page.component.html',
  styleUrl: './requests-page.component.css',
  providers: [RequestsService, RequestsStore],
})
export class RequestsComponent implements OnInit {
  protected readonly store = inject(RequestsStore);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  readonly activeTab = signal<RequestsTab>('leave');
  readonly leaveTypeId = signal('');
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly startTime = signal('');
  readonly endTime = signal('');
  readonly reason = signal('');
  readonly selectedShiftIds = signal<string[]>([]);
  readonly swapData = {
    colleagueId: '',
    type: 'SWAP' as SwapRequestType,
    myWorkDate: '',
    myShiftId: '',
    colleagueWorkDate: '',
    colleagueShiftId: '',
    reason: '',
  };
  readonly adjustData: {
    workDate: string;
    type: AttendanceAdjustmentType;
    proposedTime: string;
    reason: string;
  } = {
    workDate: '',
    type: 'FORGOT_CHECK_IN',
    proposedTime: '',
    reason: '',
  };

  readonly submitting = this.store.submitting;
  readonly leaveTypes = this.store.leaveTypes;
  readonly quotas = this.store.quotas;
  readonly myDailyShifts = this.store.myDailyShifts;
  readonly mySwapShifts = this.store.mySwapShifts;
  readonly colleagueShifts = this.store.colleagueShifts;
  readonly colleagues = this.store.colleagues;
  readonly myLeaves = this.store.myLeaves;
  readonly mySwaps = this.store.mySwaps;
  readonly myAdjustments = this.store.myAdjustments;
  readonly selectedType = computed(
    () => this.leaveTypes().find((type) => type.id === this.leaveTypeId()) ?? null,
  );
  readonly selectedQuota = computed(
    () => this.quotas().find((quota) => quota.leaveTypeId === this.leaveTypeId()) ?? null,
  );
  readonly isHourType = computed(() => this.selectedType()?.unit === 'HOUR');
  readonly isAfkType = computed(() => this.isAfkLeaveType(this.selectedType()));

  private readonly activeLeaveStatuses: ApprovalStatus[] = [
    'PENDING',
    'APPROVED',
    'CANCEL_PENDING',
  ];
  private readonly afkCode = 'AFK';
  private readonly nghiCode = 'NGHI';
  private readonly wfhCode = 'WFH';

  constructor() {
    effect(() => {
      const success = this.store.lastSuccess();
      if (!success) return;
      untracked(() => {
        if (success === 'leave') this.resetLeaveForm();
        if (success === 'swap') this.resetSwapForm();
        if (success === 'adjustment') this.resetAdjustmentForm();
        this.store.clearSuccess();
      });
    });
    effect(() => {
      const types = this.leaveTypes();
      if (!this.leaveTypeId() && types.length > 0) this.leaveTypeId.set(types[0].id);
    });
  }

  ngOnInit(): void {
    this.store.loadInitialData();
  }

  switchTab(tab: RequestsTab): void {
    this.activeTab.set(tab);
  }

  onLeaveTypeChange(leaveTypeId: string): void {
    this.leaveTypeId.set(leaveTypeId);
    if (this.isAfkLeaveType(this.selectedType())) this.selectedShiftIds.set([]);
    else this.removeUnavailableSelectedShifts();
  }

  onLeaveDateChange(): void {
    if (this.startDate() && this.startDate() === this.endDate()) {
      this.selectedShiftIds.set([]);
      this.store.loadDailyShifts(this.startDate());
    } else {
      this.store.clearDailyShifts();
      this.selectedShiftIds.set([]);
    }
  }

  toggleShiftSelection(shiftId: string): void {
    if (this.isShiftUnavailable(shiftId)) {
      this.toastService.error('Ca này đã có yêu cầu nghỉ đang chờ/đã duyệt.');
      return;
    }
    this.selectedShiftIds.update((ids) =>
      ids.includes(shiftId) ? ids.filter((id) => id !== shiftId) : [...ids, shiftId],
    );
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
    const afkMessage = this.afkOutsideAssignedShiftMessage(selectedType);
    if (afkMessage) {
      this.toastService.error(afkMessage);
      return;
    }
    const duplicateMessage = this.duplicateLeaveMessage(selectedType);
    if (duplicateMessage) {
      this.toastService.error(duplicateMessage);
      return;
    }
    const payload: CreateLeaveRequest = {
      leaveTypeId: selectedType.id,
      startDate: this.startDate(),
      endDate: this.endDate(),
      startTime: selectedType.unit === 'HOUR' ? `${this.startTime()}:00` : null,
      endTime: selectedType.unit === 'HOUR' ? `${this.endTime()}:00` : null,
      shiftIds: this.isAfkLeaveType(selectedType) ? [] : this.selectedShiftIds(),
      reason: this.reason().trim(),
    };
    this.store.submitLeave({
      payload,
      date: this.startDate() === this.endDate() ? this.startDate() : undefined,
    });
  }

  loadMySwapShifts(): void {
    if (this.swapData.myWorkDate) this.store.loadSwapShifts(this.swapData.myWorkDate);
  }

  loadColleagueShifts(): void {
    if (this.swapData.colleagueId && this.swapData.colleagueWorkDate) {
      this.store.loadColleagueShifts({
        employeeId: this.swapData.colleagueId,
        date: this.swapData.colleagueWorkDate,
      });
    }
  }

  submitSwap(): void {
    if (!this.swapData.colleagueId || !this.swapData.reason.trim()) {
      this.toastService.error('Vui lòng nhập đồng nghiệp và lý do.');
      return;
    }
    if (
      this.swapData.type === 'SWAP' &&
      (!this.swapData.myWorkDate ||
        !this.swapData.myShiftId ||
        !this.swapData.colleagueWorkDate ||
        !this.swapData.colleagueShiftId)
    ) {
      this.toastService.error('Vui lòng chọn đầy đủ ngày ca đổi của bạn và đồng nghiệp.');
      return;
    }
    if (this.swapData.type === 'COVER' && (!this.swapData.myWorkDate || !this.swapData.myShiftId)) {
      this.toastService.error('Vui lòng chọn ca làm việc của bạn cần nhờ trực thay.');
      return;
    }
    const payload: CreateSwapRequest = {
      targetEmployee: { id: this.swapData.colleagueId },
      workDate: this.swapData.myWorkDate,
      shift: this.swapData.myShiftId ? { id: this.swapData.myShiftId } : null,
      targetWorkDate: this.swapData.type === 'SWAP' ? this.swapData.colleagueWorkDate : null,
      targetShift:
        this.swapData.type === 'SWAP' && this.swapData.colleagueShiftId
          ? { id: this.swapData.colleagueShiftId }
          : null,
      type: this.swapData.type,
      reason: this.swapData.reason.trim(),
      status: 'PENDING',
    };
    this.store.submitSwap(payload);
  }

  submitAdjustment(): void {
    if (
      !this.adjustData.workDate ||
      !this.adjustData.proposedTime ||
      !this.adjustData.reason.trim()
    ) {
      this.toastService.error('Vui lòng nhập ngày, giờ điều chỉnh và lý do.');
      return;
    }
    this.store.submitAdjustment({
      workDate: this.adjustData.workDate,
      type: this.adjustData.type,
      proposedTime: `${this.adjustData.proposedTime}:00`,
      reason: this.adjustData.reason.trim(),
      status: 'PENDING',
    });
  }

  async cancelLeave(id: string): Promise<void> {
    if (await this.confirmCancellation('Bạn có chắc chắn muốn hủy yêu cầu nghỉ này?'))
      this.store.cancelLeave({
        id,
        date: this.startDate() === this.endDate() ? this.startDate() : undefined,
      });
  }
  async cancelSwap(id: string): Promise<void> {
    if (await this.confirmCancellation('Bạn có chắc chắn muốn hủy yêu cầu đổi ca này?'))
      this.store.cancelSwap(id);
  }
  async cancelAdjustment(id: string): Promise<void> {
    if (await this.confirmCancellation('Bạn có chắc chắn muốn hủy yêu cầu chỉnh công này?'))
      this.store.cancelAdjustment(id);
  }

  unitLabel(unit: LeaveType['unit'] | undefined): string {
    return unit === 'HOUR' ? 'giờ' : 'ngày';
  }
  getStatusLabel(status: ApprovalStatus): string {
    return (
      {
        APPROVED: 'Đã duyệt',
        PENDING: 'Đang chờ',
        REJECTED: 'Từ chối',
        CANCELLED: 'Đã hủy',
        CANCEL_PENDING: 'Chờ duyệt hủy',
      } as Record<ApprovalStatus, string>
    )[status];
  }
  formatLeaveSubtitle(request: LeaveRequest): string {
    const time = (value: string | null) => (value ? value.slice(0, 5) : '--:--');
    const base =
      request.leaveType?.unit === 'HOUR'
        ? `${request.startDate} · ${time(request.startTime)} - ${time(request.endTime)} · ${request.amount} giờ`
        : `${request.startDate} đến ${request.endDate} · ${request.amount} ngày`;
    return request.targetShifts?.length
      ? `${base} (${request.targetShifts.map((shift) => shift.name).join(', ')})`
      : base;
  }
  formatSwapSubtitle(request: ShiftSwapRequest): string {
    const label = request.type === 'SWAP' ? 'Đổi ca' : 'Trực thay';
    return request.type === 'SWAP'
      ? `${label}: Ca của bạn (${request.workDate} · ${request.shift?.name || 'Kỳ ca'}) ⇄ Colleague (${request.targetWorkDate} · ${request.targetShift?.name || 'Kỳ ca'})`
      : `${label}: Ca của bạn (${request.workDate} · ${request.shift?.name || 'Kỳ ca'}) ⇄ đồng nghiệp ${request.targetEmployee.fullName} trực giúp`;
  }
  formatAdjustSubtitle(request: AttendanceAdjustment): string {
    return `${request.workDate} · Đề xuất giờ: ${request.proposedTime.slice(0, 5)} · Loại: ${this.adjustmentTypeLabel(request.type)}`;
  }
  isShiftUnavailable(shiftId: string): boolean {
    const shift = this.myDailyShifts().find((item) => item.shiftId === shiftId);
    return (
      !!shift &&
      this.myLeaves().some((request) =>
        this.activeLeaveOccupiesShiftForSelectedType(request, shift),
      )
    );
  }

  private async confirmCancellation(content: string): Promise<boolean> {
    return firstValueFrom(this.confirmService.open({ title: 'Xác nhận hủy yêu cầu', content }));
  }
  private resetLeaveForm(): void {
    this.reason.set('');
    this.startTime.set('');
    this.endTime.set('');
    this.selectedShiftIds.set([]);
    this.store.clearDailyShifts();
  }
  private resetSwapForm(): void {
    this.swapData.reason = '';
    this.swapData.myWorkDate = '';
    this.swapData.myShiftId = '';
    this.swapData.colleagueWorkDate = '';
    this.swapData.colleagueShiftId = '';
    this.store.clearSwapShifts();
    this.store.clearColleagueShifts();
  }
  private resetAdjustmentForm(): void {
    this.adjustData.reason = '';
    this.adjustData.proposedTime = '';
    this.adjustData.workDate = '';
  }
  private removeUnavailableSelectedShifts(): void {
    if (this.startDate() && this.startDate() === this.endDate())
      this.selectedShiftIds.set(
        this.selectedShiftIds().filter((id) => !this.isShiftUnavailable(id)),
      );
  }
  private adjustmentTypeLabel(type: AttendanceAdjustment['type']): string {
    return (
      (
        {
          FORGOT_CHECK_IN: 'Quên check-in',
          FORGOT_CHECK_OUT: 'Quên check-out',
          DEVICE_ERROR: 'Lỗi máy chấm công',
          EDIT_TIME: 'Điều chỉnh giờ',
        } as Record<string, string>
      )[type] ?? type
    );
  }
  private afkOutsideAssignedShiftMessage(type: LeaveType): string | null {
    if (!this.isAfkLeaveType(type)) return null;
    const start = this.startTime() ? `${this.startTime()}:00` : null;
    const end = this.endTime() ? `${this.endTime()}:00` : null;
    return this.myDailyShifts().some(
      (shift) =>
        shift.shiftType !== 'OFF' &&
        this.timeRangeContains(shift.startTime, shift.endTime, start, end),
    )
      ? null
      : 'Khung giờ AFK phải nằm trong ca làm việc của bạn.';
  }
  private duplicateLeaveMessage(type: LeaveType): string | null {
    const isHour = type.unit === 'HOUR';
    const start = this.startTime() ? `${this.startTime()}:00` : null;
    const end = this.endTime() ? `${this.endTime()}:00` : null;
    if (this.isAfkLeaveType(type))
      return this.myLeaves().some(
        (r) =>
          this.isActiveLeave(r) &&
          this.leaveCoversDate(r, this.startDate()) &&
          !this.isWfhRequest(r) &&
          (this.isFullDayLeave(r) ||
            ((this.isAfkRequest(r) || this.isNghiRequest(r)) &&
              this.timeRangesOverlap(start, end, r.startTime, r.endTime))),
      )
        ? 'Khung giờ AFK này đã trùng với yêu cầu AFK/nghỉ đang chờ hoặc đã duyệt.'
        : null;
    if (isHour)
      return this.myLeaves().some(
        (r) =>
          this.isActiveLeave(r) &&
          this.leaveCoversDate(r, this.startDate()) &&
          (this.isFullDayLeave(r) ||
            (r.leaveType?.unit === 'HOUR' &&
              this.timeRangesOverlap(start, end, r.startTime, r.endTime))),
      )
        ? 'Khung giờ này đã có yêu cầu nghỉ đang chờ/đã duyệt.'
        : null;
    if (
      this.startDate() === this.endDate() &&
      this.selectedShiftIds().some((id) => this.isShiftUnavailable(id))
    )
      return 'Ca đã chọn đã có yêu cầu nghỉ đang chờ/đã duyệt.';
    return this.myLeaves().some(
      (r) =>
        this.isActiveLeave(r) &&
        this.dateRangesOverlap(this.startDate(), this.endDate(), r.startDate, r.endDate) &&
        !(this.isWfhLeaveType(type) && this.isAfkRequest(r)),
    )
      ? 'Khoảng ngày này đã có yêu cầu nghỉ đang chờ/đã duyệt.'
      : null;
  }
  private activeLeaveOccupiesShiftForSelectedType(request: LeaveRequest, shift: ShiftDto): boolean {
    return (
      !(this.isWfhLeaveType(this.selectedType()) && this.isAfkRequest(request)) &&
      this.activeLeaveOccupiesShift(request, shift)
    );
  }
  private activeLeaveOccupiesShift(request: LeaveRequest, shift: ShiftDto): boolean {
    return (
      this.isActiveLeave(request) &&
      this.leaveCoversDate(request, shift.workDate) &&
      (this.isFullDayLeave(request) || request.leaveType?.unit === 'HOUR'
        ? this.isFullDayLeave(request) ||
          this.timeRangesOverlap(shift.startTime, shift.endTime, request.startTime, request.endTime)
        : (request.targetShifts ?? []).some((target) => target.id === shift.shiftId))
    );
  }
  private isActiveLeave(request: LeaveRequest): boolean {
    return this.activeLeaveStatuses.includes(request.status);
  }
  private isFullDayLeave(request: LeaveRequest): boolean {
    return (
      request.leaveType?.unit !== 'HOUR' &&
      (!request.targetShifts || request.targetShifts.length === 0)
    );
  }
  private isAfkRequest(request: LeaveRequest): boolean {
    return this.isAfkLeaveType(request.leaveType);
  }
  private isNghiRequest(request: LeaveRequest): boolean {
    return this.hasLeaveTypeCode(request.leaveType, this.nghiCode);
  }
  private isWfhRequest(request: LeaveRequest): boolean {
    return this.isWfhLeaveType(request.leaveType);
  }
  private isAfkLeaveType(type: LeaveType | null | undefined): boolean {
    return this.hasLeaveTypeCode(type, this.afkCode);
  }
  private isWfhLeaveType(type: LeaveType | null | undefined): boolean {
    return this.hasLeaveTypeCode(type, this.wfhCode);
  }
  private hasLeaveTypeCode(type: LeaveType | null | undefined, code: string): boolean {
    return type?.code.toUpperCase() === code;
  }
  private leaveCoversDate(request: LeaveRequest, date: string): boolean {
    return request.startDate <= date && request.endDate >= date;
  }
  private dateRangesOverlap(
    firstStart: string,
    firstEnd: string,
    secondStart: string,
    secondEnd: string,
  ): boolean {
    return firstStart <= secondEnd && secondStart <= firstEnd;
  }
  private timeRangesOverlap(
    firstStart: string | null,
    firstEnd: string | null,
    secondStart: string | null,
    secondEnd: string | null,
  ): boolean {
    return (
      !!firstStart &&
      !!firstEnd &&
      !!secondStart &&
      !!secondEnd &&
      firstStart.slice(0, 5) < secondEnd.slice(0, 5) &&
      secondStart.slice(0, 5) < firstEnd.slice(0, 5)
    );
  }
  private timeRangeContains(
    containerStart: string | null,
    containerEnd: string | null,
    innerStart: string | null,
    innerEnd: string | null,
  ): boolean {
    return (
      !!containerStart &&
      !!containerEnd &&
      !!innerStart &&
      !!innerEnd &&
      innerStart.slice(0, 5) >= containerStart.slice(0, 5) &&
      innerEnd.slice(0, 5) <= containerEnd.slice(0, 5)
    );
  }
}
