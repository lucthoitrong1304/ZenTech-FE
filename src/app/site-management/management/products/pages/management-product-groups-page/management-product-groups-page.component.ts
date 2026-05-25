import { CommonModule } from '@angular/common';
import { Component, effect, inject, untracked } from '@angular/core';
import { LucidePlus } from '@lucide/angular';
import { filter, take } from 'rxjs';
import { ConfirmService } from '../../../../../shared/components/confirm/confirm.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ProductGroupDialogComponent } from '../../components/product-group-dialog/product-group-dialog.component';
import { ProductGroupTableComponent } from '../../components/product-group-table/product-group-table.component';
import { ProductGroupToolbarComponent } from '../../components/product-group-toolbar/product-group-toolbar.component';
import {
  ManagementProductGroup,
  ManagementProductGroupDraft,
  ManagementProductGroupQuery,
} from '../../data-access/models/management-product.models';
import { ManagementProductGroupsStore } from '../../data-access/store/management-product-groups.store';

@Component({
  selector: 'app-management-product-groups-page',
  standalone: true,
  imports: [
    CommonModule,
    LucidePlus,
    ProductGroupDialogComponent,
    ProductGroupTableComponent,
    ProductGroupToolbarComponent,
  ],
  templateUrl: './management-product-groups-page.component.html',
  styleUrl: './management-product-groups-page.component.css',
  providers: [ManagementProductGroupsStore],
})
export class ManagementProductGroupsPageComponent {
  protected readonly store = inject(ManagementProductGroupsStore);
  private readonly confirmService = inject(ConfirmService);
  private readonly toastService = inject(ToastService);

  constructor() {
    this.store.loadGroups();
    this.store.loadProductOptions();

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

  protected setActiveFilter(activeFilter: ManagementProductGroupQuery['activeFilter']): void {
    this.store.setActiveFilter(activeFilter);
  }

  protected setSort(sort: ManagementProductGroupQuery['sort']): void {
    this.store.setSort(sort);
  }

  protected updateDraft(patch: Partial<ManagementProductGroupDraft>): void {
    this.store.updateDraft(patch);
  }

  protected confirmDeleteGroup(group: ManagementProductGroup): void {
    this.confirmService
      .open({
        title: 'Xoa nhom san pham',
        content: `Ban co chac muon xoa nhom ${group.name} khoi danh sach mock khong?`,
      })
      .pipe(
        take(1),
        filter(Boolean)
      )
      .subscribe(() => this.store.deleteGroup(group.groupId));
  }
}
