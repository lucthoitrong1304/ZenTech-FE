import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, computed, effect, inject, untracked } from '@angular/core';
import { filter, take } from 'rxjs';
import { ConfirmService } from '../../../../../shared/components/confirm/confirm.service';
import {
  ManagementErrorStateComponent,
  ManagementPageHeroComponent,
  ManagementPageShellComponent,
  ManagementStatCardComponent,
  ManagementToolbarSurfaceComponent,
} from '../../../../../shared/components/management-ui';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { CustomerDetailDialogComponent } from '../../components/customer-detail-dialog/customer-detail-dialog.component';
import { CustomerTableComponent } from '../../components/customer-table/customer-table.component';
import { CustomerToolbarComponent } from '../../components/customer-toolbar/customer-toolbar.component';
import { CustomerActiveFilter, CustomerSort } from '../../data-access/models/customer.models';
import { CustomerStore } from '../../data-access/store/customer.store';
import { PermissionService } from '../../../../../core/permissions/permission.service';
import { PermissionCode } from '../../../../../core/permissions/permission.models';

@Component({
  selector: 'app-customer-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    CustomerDetailDialogComponent,
    CustomerTableComponent,
    CustomerToolbarComponent,
    ManagementErrorStateComponent,
    ManagementPageHeroComponent,
    ManagementPageShellComponent,
    ManagementStatCardComponent,
    ManagementToolbarSurfaceComponent,
  ],
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.css',
  providers: [CustomerStore],
})
export class CustomerListComponent {
  private readonly confirmService = inject(ConfirmService);
  private readonly toastService = inject(ToastService);
  private readonly permissionService = inject(PermissionService);
  protected readonly canUpdateCustomer = computed(() => this.permissionService.has(PermissionCode.CUSTOMER_UPDATE));
  protected readonly store = inject(CustomerStore);

  protected readonly activeFilterLabel = computed(() => {
    const filterValue = this.store.query().activeFilter;
    switch (filterValue) {
      case 'active':
        return 'Đang hoạt động';
      case 'inactive':
        return 'Đã khóa';
      default:
        return 'Tất cả tài khoản';
    }
  });

  protected readonly sortLabel = computed(() => {
    const sortValue = this.store.query().sort;
    switch (sortValue) {
      case 'registeredAt,asc':
        return 'Đăng ký cũ nhất';
      case 'fullName,asc':
        return 'Tên A - Z';
      case 'email,asc':
        return 'Email A - Z';
      default:
        return 'Đăng ký mới nhất';
    }
  });

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

    effect(() => {
      const message = this.store.successMessage();

      if (message) {
        untracked(() => {
          this.toastService.success(message);
          this.store.clearMessages();
        });
      }
    });

    effect(() => {
      const message = this.store.statusErrorMessage();

      if (message) {
        untracked(() => {
          this.toastService.error(message);
          this.store.clearMessages();
        });
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
    if (!this.canUpdateCustomer()) {
      this.toastService.error('Không có quyền thực hiện thao tác này.');
      return;
    }

    this.confirmService
      .open({
        title: event.active ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
        content: event.active
          ? 'Bạn có chắc muốn mở khóa tài khoản khách hàng này không?'
          : 'Bạn có chắc muốn khóa tài khoản khách hàng này không?',
      })
      .pipe(
        take(1),
        filter(Boolean)
      )
      .subscribe(() => this.store.updateCustomerStatus(event));
  }
}
