import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, effect, inject, untracked } from '@angular/core';
import {
  LucidePackagePlus,
  LucideSparkles,
  LucideTriangleAlert,
  LucideTrendingUp,
  LucideWallet,
  LucideWarehouse,
} from '@lucide/angular';
import { filter, take } from 'rxjs';
import { ConfirmService } from '../../../../../shared/components/confirm/confirm.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ProductTableComponent } from '../../components/product-table/product-table.component';
import { ProductToolbarComponent } from '../../components/product-toolbar/product-toolbar.component';
import { ProductDialogComponent } from '../../components/product-dialog/product-dialog.component';
import {
  ManagementProduct,
  ManagementProductQuery,
} from '../../data-access/models/management-product.models';
import { ManagementProductsStore } from '../../data-access/store/management-products.store';

@Component({
  selector: 'app-management-products-page',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    LucidePackagePlus,
    LucideSparkles,
    LucideTriangleAlert,
    LucideTrendingUp,
    LucideWallet,
    LucideWarehouse,
    ProductTableComponent,
    ProductToolbarComponent,
    ProductDialogComponent,
  ],
  templateUrl: './management-products-page.component.html',
  styleUrl: './management-products-page.component.css',
  providers: [ManagementProductsStore],
})
export class ManagementProductsPageComponent {
  protected readonly store = inject(ManagementProductsStore);
  private readonly confirmService = inject(ConfirmService);
  private readonly toastService = inject(ToastService);

  constructor() {
    this.store.loadProducts();

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

  protected setStockFilter(stockStatus: ManagementProductQuery['stockStatus']): void {
    this.store.setStockFilter(stockStatus);
  }

  protected setSort(sort: ManagementProductQuery['sort']): void {
    this.store.setSort(sort);
  }

  protected addProduct(): void {
    this.store.openCreateDialog();
  }

  protected editProduct(product: ManagementProduct): void {
    this.store.openEditDialog(product.productId);
  }

  protected confirmDeleteProduct(product: ManagementProduct): void {
    this.confirmService
      .open({
        title: 'Xóa sản phẩm',
        content: `Bạn có chắc muốn xóa ${product.name} khỏi danh sách mock không?`,
      })
      .pipe(
        take(1),
        filter(Boolean)
      )
      .subscribe(() => this.store.deleteProduct(product.productId));
  }
}
