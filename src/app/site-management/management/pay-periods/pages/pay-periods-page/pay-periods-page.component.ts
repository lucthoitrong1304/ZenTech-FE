import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideLoader2, LucideLock, LucidePlus, LucideUnlock } from '@lucide/angular';
import { PermissionCode } from '@/core/permissions/permission.models';
import { PermissionService } from '@/core/permissions/permission.service';
import { ToastService } from '@/shared/components/toast/toast.service';
import { PayPeriod } from '@/site-management/management/pay-periods/data-access/models/pay-period.models';
import { PayPeriodStore } from '@/site-management/management/pay-periods/data-access/store/pay-period.store';

@Component({
  selector: 'app-pay-periods',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, LucideLock, LucideUnlock, LucidePlus, LucideLoader2],
  providers: [PayPeriodStore],
  templateUrl: './pay-periods-page.component.html',
  styleUrl: './pay-periods-page.component.css',
})
export class PayPeriodsComponent implements OnInit {
  private readonly toastService = inject(ToastService);
  private readonly permissionService = inject(PermissionService);
  private readonly store = inject(PayPeriodStore);

  protected readonly canUpdatePayPeriod = computed(() =>
    this.permissionService.has(PermissionCode.PAY_PERIOD_UPDATE),
  );
  protected readonly periods = this.store.periods;
  protected readonly submittingId = this.store.submittingId;
  protected readonly modalOpen = signal(false);
  protected newPeriod = { name: '', startDate: '', endDate: '' };

  ngOnInit(): void {
    this.store.load();
  }

  protected openCreateModal(): void {
    if (!this.canUpdatePayPeriod()) {
      this.toastService.error('Không có quyền thực hiện thao tác này.');
      return;
    }
    this.newPeriod = { name: '', startDate: '', endDate: '' };
    this.modalOpen.set(true);
  }

  protected closeCreateModal(): void {
    this.modalOpen.set(false);
  }

  protected createPeriod(): void {
    if (!this.canUpdatePayPeriod()) {
      this.toastService.error('Không có quyền thực hiện thao tác này.');
      return;
    }
    if (!this.newPeriod.name || !this.newPeriod.startDate || !this.newPeriod.endDate) {
      this.toastService.error('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    this.store.create(this.newPeriod);
    this.modalOpen.set(false);
  }

  protected toggleLock(period: PayPeriod): void {
    if (!this.canUpdatePayPeriod()) {
      this.toastService.error('Không có quyền thực hiện thao tác này.');
      return;
    }
    this.store.setLocked(period);
  }
}
