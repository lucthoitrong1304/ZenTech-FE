import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, effect, inject, untracked } from '@angular/core';
import { LucideFileDown } from '@lucide/angular';
import {
  ManagementPageHeroComponent,
  ManagementPageShellComponent,
  ManagementStatCardComponent,
  ManagementToolbarSurfaceComponent,
} from '../../../../../shared/components/management-ui';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { OrderDetailDrawerComponent } from '../../components/order-detail-drawer/order-detail-drawer.component';
import { OrderEditDrawerComponent } from '../../components/order-edit-drawer/order-edit-drawer.component';
import { OrderTableComponent } from '../../components/order-table/order-table.component';
import { OrderToolbarComponent } from '../../components/order-toolbar/order-toolbar.component';
import {
  ManagementOrderDateFilter,
  ManagementOrderEditDraft,
  ManagementOrderSort,
  ManagementOrderStatusFilter,
} from '../../data-access/models/management-order.models';
import { ManagementOrdersStore } from '../../data-access/store/management-orders.store';

@Component({
  selector: 'app-management-orders-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    LucideFileDown,
    ManagementPageHeroComponent,
    ManagementPageShellComponent,
    ManagementStatCardComponent,
    ManagementToolbarSurfaceComponent,
    OrderDetailDrawerComponent,
    OrderEditDrawerComponent,
    OrderTableComponent,
    OrderToolbarComponent,
  ],
  templateUrl: './management-orders-page.component.html',
  styleUrl: './management-orders-page.component.css',
  providers: [ManagementOrdersStore],
})
export class ManagementOrdersPageComponent {
  protected readonly store = inject(ManagementOrdersStore);
  private readonly toastService = inject(ToastService);

  constructor() {
    this.store.loadOrders();

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
      const message = this.store.errorMessage();

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

  protected setStatusFilter(status: ManagementOrderStatusFilter): void {
    this.store.setStatusFilter(status);
  }

  protected setDateFilter(dateFilter: ManagementOrderDateFilter): void {
    this.store.setDateFilter(dateFilter);
  }

  protected setSort(sort: ManagementOrderSort): void {
    this.store.setSort(sort);
  }

  protected updateDraft(patch: Partial<ManagementOrderEditDraft>): void {
    this.store.updateEditDraft(patch);
  }

  protected updateQuantity(event: { orderItemId: string; quantity: number }): void {
    this.store.updateEditQuantity(event.orderItemId, event.quantity);
  }

  protected exportReport(): void {
    this.toastService.success('Báo cáo đơn hàng mock đã sẵn sàng để nối API xuất file.');
  }

  protected printInvoice(orderId: string): void {
    this.toastService.success(`Đã gửi lệnh in hóa đơn cho ${orderId}.`);
  }
}
