import { CommonModule } from '@angular/common';
import { Component, effect, inject, untracked } from '@angular/core';
import { filter, switchMap, take } from 'rxjs';
import { ConfirmService } from '../../../../../shared/components/confirm/confirm.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { CustomerDetailDialogComponent } from '../../components/customer-detail-dialog/customer-detail-dialog.component';
import { CustomerTableComponent } from '../../components/customer-table/customer-table.component';
import { CustomerToolbarComponent } from '../../components/customer-toolbar/customer-toolbar.component';
import {
  CustomerActiveFilter,
  CustomerSort,
} from '../../data-access/models/customer.models';
import { CustomerStore } from '../../data-access/store/customer.store';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    CommonModule,
    CustomerDetailDialogComponent,
    CustomerTableComponent,
    CustomerToolbarComponent,
  ],
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.css',
  providers: [CustomerStore],
})
export class CustomerListComponent {
  private readonly confirmService = inject(ConfirmService);
  private readonly toastService = inject(ToastService);
  protected readonly store = inject(CustomerStore);

  constructor() {
    this.store.loadCustomers();

    effect(() => {
      const error = this.store.error();

      if (error) {
        untracked(() => this.toastService.error(error));
      }
    });

    effect(() => {
      const error = this.store.selectedCustomerError();

      if (error) {
        untracked(() => this.toastService.error(error));
      }
    });
  }

  protected setKeyword(keyword: string): void {
    this.store.setKeyword(keyword);
  }

  protected setActiveFilter(activeFilter: CustomerActiveFilter): void {
    this.store.setActiveFilter(activeFilter);
  }

  protected setSort(sort: CustomerSort): void {
    this.store.setSort(sort);
  }

  protected confirmStatusChange(event: { customerId: string; active: boolean }): void {
    const actionLabel = event.active ? 'mở khóa' : 'khóa';
    const successMessage = event.active
      ? 'Mở khóa tài khoản khách hàng thành công.'
      : 'Khóa tài khoản khách hàng thành công.';

    this.confirmService
      .open({
        title: event.active ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
        content: event.active
          ? 'Bạn có chắc muốn mở khóa tài khoản khách hàng này không?'
          : 'Bạn có chắc muốn khóa tài khoản khách hàng này không?',
      })
      .pipe(
        take(1),
        filter(Boolean),
        switchMap(() => this.store.updateCustomerStatus(event.customerId, event.active))
      )
      .subscribe({
        next: () => this.toastService.success(successMessage),
        error: () =>
          this.toastService.error(`Không thể ${actionLabel} tài khoản khách hàng lúc này.`),
      });
  }
}
