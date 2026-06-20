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
  template: `
    <div class="flex flex-col gap-6 p-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Yêu cầu & Đề xuất</h1>
        <p class="text-gray-500 text-sm mt-1">Gửi đề xuất nghỉ phép, đổi ca làm việc hoặc bổ sung giờ công thiếu.</p>
      </div>

      <!-- Tab Buttons -->
      <div class="flex border-b border-gray-200 gap-4">
        <button (click)="activeTab.set('leave')" 
                [ngClass]="activeTab() === 'leave' ? 'border-[#FFC700] text-gray-900 font-semibold' : 'border-transparent text-gray-500'"
                class="py-2.5 px-4 border-b-2 text-sm transition-all flex items-center gap-2">
          <svg lucideFileText class="w-4 h-4"></svg> Đăng ký nghỉ phép
        </button>
        <button (click)="activeTab.set('swap')" 
                [ngClass]="activeTab() === 'swap' ? 'border-[#FFC700] text-gray-900 font-semibold' : 'border-transparent text-gray-500'"
                class="py-2.5 px-4 border-b-2 text-sm transition-all flex items-center gap-2">
          <svg lucideCalendarClock class="w-4 h-4"></svg> Đổi ca / Làm thay
        </button>
        <button (click)="activeTab.set('adjust')" 
                [ngClass]="activeTab() === 'adjust' ? 'border-[#FFC700] text-gray-900 font-semibold' : 'border-transparent text-gray-500'"
                class="py-2.5 px-4 border-b-2 text-sm transition-all flex items-center gap-2">
          <svg lucideFileEdit class="w-4 h-4"></svg> Chỉnh sửa giờ công
        </button>
      </div>

      <!-- Responsive Grid Layout: 2 Columns on Desktop, Stacked on Mobile -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        
        <!-- Left Column: Active Form (span 3) -->
        <div class="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <!-- Leave Form -->
          @if (activeTab() === 'leave') {
            <div class="flex flex-col gap-4">
              <h2 class="font-bold text-gray-900 text-lg">Đăng ký nghỉ phép</h2>
              <div class="grid grid-cols-2 gap-4">
                <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Từ ngày
                  <input type="date" [(ngModel)]="leaveData.startDate" class="border border-gray-300 rounded-lg p-2 outline-none" />
                </label>
                <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Đến ngày
                  <input type="date" [(ngModel)]="leaveData.endDate" class="border border-gray-300 rounded-lg p-2 outline-none" />
                </label>
              </div>
              <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                Loại phép
                <select [(ngModel)]="leaveData.leaveType" class="border border-gray-300 rounded-lg p-2 outline-none bg-white">
                  <option value="PAID">Nghỉ phép năm (Có lương)</option>
                  <option value="UNPAID">Nghỉ không lương</option>
                  <option value="SICK">Nghỉ ốm (BHXH)</option>
                </select>
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                Lý do xin nghỉ
                <textarea [(ngModel)]="leaveData.reason" rows="3" placeholder="Nhập lý do chi tiết..." class="border border-gray-300 rounded-lg p-2 outline-none"></textarea>
              </label>
              <button (click)="submitLeave()" [disabled]="submitting()"
                      class="bg-[#FFC700] hover:bg-[#FFD633] text-gray-900 font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50">
                @if (submitting()) { <svg lucideLoader2 class="w-4 h-4 animate-spin"></svg> }
                Gửi yêu cầu nghỉ phép
              </button>
            </div>
          }

          <!-- Swap Form -->
          @if (activeTab() === 'swap') {
            <div class="flex flex-col gap-4">
              <h2 class="font-bold text-gray-900 text-lg">Yêu cầu Đổi ca / Làm thay</h2>
              <div class="grid grid-cols-2 gap-4">
                <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Hình thức
                  <select [(ngModel)]="swapData.type" class="border border-gray-300 rounded-lg p-2 outline-none bg-white">
                    <option value="COVER">Nhờ làm thay ca (Cover)</option>
                    <option value="SWAP">Đổi ca chéo (Swap)</option>
                  </select>
                </label>
                <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Ngày cần đổi/làm thay
                  <input type="date" [(ngModel)]="swapData.workDate" class="border border-gray-300 rounded-lg p-2 outline-none" />
                </label>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Ca của bạn
                  <select [(ngModel)]="swapData.shiftId" class="border border-gray-300 rounded-lg p-2 outline-none bg-white">
                    @for (sh of shifts(); track sh.id) {
                      <option [value]="sh.id">{{ sh.name }} ({{ sh.startTime.slice(0,5) }} - {{ sh.endTime.slice(0,5) }})</option>
                    }
                  </select>
                </label>
                <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Nhân viên đổi/làm thay
                  <select [(ngModel)]="swapData.targetEmployeeId" class="border border-gray-300 rounded-lg p-2 outline-none bg-white">
                    @for (emp of employees(); track emp.id) {
                      <option [value]="emp.id">{{ emp.fullName }}</option>
                    }
                  </select>
                </label>
              </div>
              
              @if (swapData.type === 'SWAP') {
                <div class="grid grid-cols-2 gap-4 border border-dashed border-gray-200 rounded-lg p-3 bg-gray-50">
                  <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                    Ngày nhận lại ca
                    <input type="date" [(ngModel)]="swapData.targetWorkDate" class="border border-gray-300 rounded-lg p-2 outline-none" />
                  </label>
                  <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                    Ca nhận lại
                    <select [(ngModel)]="swapData.targetShiftId" class="border border-gray-300 rounded-lg p-2 outline-none bg-white">
                      @for (sh of shifts(); track sh.id) {
                        <option [value]="sh.id">{{ sh.name }} ({{ sh.startTime.slice(0,5) }} - {{ sh.endTime.slice(0,5) }})</option>
                      }
                    </select>
                  </label>
                </div>
              }

              <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                Lý do đổi/làm thay
                <textarea [(ngModel)]="swapData.reason" rows="3" placeholder="Nhập lý do đổi ca..." class="border border-gray-300 rounded-lg p-2 outline-none"></textarea>
              </label>
              <button (click)="submitSwap()" [disabled]="submitting()"
                      class="bg-[#FFC700] hover:bg-[#FFD633] text-gray-900 font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50">
                @if (submitting()) { <svg lucideLoader2 class="w-4 h-4 animate-spin"></svg> }
                Gửi yêu cầu đổi ca
              </button>
            </div>
          }

          <!-- Adjustment Form -->
          @if (activeTab() === 'adjust') {
            <div class="flex flex-col gap-4">
              <h2 class="font-bold text-gray-900 text-lg">Đề xuất Chỉnh sửa giờ công</h2>
              <div class="grid grid-cols-2 gap-4">
                <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Ngày chỉnh công
                  <input type="date" [(ngModel)]="adjustData.workDate" class="border border-gray-300 rounded-lg p-2 outline-none" />
                </label>
                <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Loại lỗi công
                  <select [(ngModel)]="adjustData.type" class="border border-gray-300 rounded-lg p-2 outline-none bg-white">
                    <option value="FORGOT_CHECK_IN">Quên check-in</option>
                    <option value="FORGOT_CHECK_OUT">Quên check-out</option>
                    <option value="DEVICE_ERROR">Camera/Lỗi hệ thống</option>
                    <option value="EDIT_TIME">Sửa giờ vào/ra</option>
                  </select>
                </label>
              </div>
              <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                Giờ đề xuất bổ sung
                <input type="time" [(ngModel)]="adjustData.proposedTime" class="border border-gray-300 rounded-lg p-2 outline-none" />
              </label>
              <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
                Lý do giải trình
                <textarea [(ngModel)]="adjustData.reason" rows="3" placeholder="Ví dụ: camera lỗi không scan được mặt, quên quẹt thẻ lúc về..." class="border border-gray-300 rounded-lg p-2 outline-none"></textarea>
              </label>
              <button (click)="submitAdjust()" [disabled]="submitting()"
                      class="bg-[#FFC700] hover:bg-[#FFD633] text-gray-900 font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50">
                @if (submitting()) { <svg lucideLoader2 class="w-4 h-4 animate-spin"></svg> }
                Gửi yêu cầu chỉnh công
              </button>
            </div>
          }
        </div>

        <!-- Right Column: Recent Requests History (span 2) -->
        <div class="lg:col-span-2 flex flex-col gap-4">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4">
            <div class="flex items-center gap-2 border-b border-gray-100 pb-3">
              <svg class="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <h3 class="font-bold text-gray-900">Lịch sử đề xuất gần đây</h3>
            </div>

            <div class="flex flex-col gap-3 max-h-[460px] overflow-y-auto pr-1">
              @for (req of myRequestsHistory(); track req.id) {
                <div class="border border-gray-100 rounded-lg p-3.5 hover:bg-gray-50 transition-colors flex flex-col gap-2">
                  <div class="flex justify-between items-start gap-2">
                    <div class="flex flex-col">
                      <strong class="text-sm text-gray-900">{{ req.title }}</strong>
                      <span class="text-xs text-gray-500 mt-0.5">{{ req.subtitle }}</span>
                    </div>
                    <span [ngClass]="getStatusBadgeClass(req.status)" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">
                      {{ getStatusLabel(req.status) }}
                    </span>
                  </div>

                  <p class="text-xs text-gray-600 bg-gray-50 p-2 rounded italic">"{{ req.reason }}"</p>
                  
                  @if (req.status === 'REJECTED' && req.rejectionReason) {
                    <div class="text-[11px] text-red-600 bg-red-50 p-2 rounded border border-red-100 flex items-start gap-1.5">
                      <svg class="w-3.5 h-3.5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <div>
                        <span class="font-semibold">Lý do từ chối:</span> {{ req.rejectionReason }}
                      </div>
                    </div>
                  }

                  <span class="text-[10px] text-gray-400 text-right self-end mt-1">
                    Gửi lúc: {{ req.requestedAt | date:'dd/MM/yyyy HH:mm' }}
                  </span>
                </div>
              } @empty {
                <div class="text-center py-12 text-gray-400 text-sm flex flex-col items-center gap-2">
                  <svg class="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>Chưa có yêu cầu nào trong tab này.</span>
                </div>
              }
            </div>
          </div>
        </div>

      </div>
    </div>
  `
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
