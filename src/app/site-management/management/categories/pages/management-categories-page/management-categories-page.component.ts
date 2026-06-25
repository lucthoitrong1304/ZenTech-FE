import { CommonModule } from '@angular/common';
import { Component, effect, inject, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideChevronDown,
  LucideChevronUp,
  LucideEye,
  LucideEyeOff,
  LucideFolderTree,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import { DialogModule } from 'primeng/dialog';
import { filter, take } from 'rxjs';
import { ConfirmService } from '../../../../../shared/components/confirm/confirm.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import {
  ManagementCategory,
  ManagementCategoryDraft,
  ManagementCategoryQuery,
} from '../../data-access/models/management-category.models';
import { ManagementCategoriesStore } from '../../data-access/store/management-categories.store';

@Component({
  selector: 'app-management-categories-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    LucideChevronDown,
    LucideChevronUp,
    LucideEye,
    LucideEyeOff,
    LucideFolderTree,
    LucidePencil,
    LucidePlus,
    LucideRefreshCw,
    LucideSearch,
    LucideTrash2,
    LucideX,
  ],
  templateUrl: './management-categories-page.component.html',
  styleUrl: './management-categories-page.component.css',
  providers: [ManagementCategoriesStore],
})
export class ManagementCategoriesPageComponent {
  protected readonly store = inject(ManagementCategoriesStore);
  private readonly confirmService = inject(ConfirmService);
  private readonly toastService = inject(ToastService);

  constructor() {
    this.store.loadCategories();

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

  protected setVisibilityFilter(visibility: ManagementCategoryQuery['visibility']): void {
    this.store.setVisibilityFilter(visibility);
  }

  protected updateDraft(patch: Partial<ManagementCategoryDraft>): void {
    this.store.updateDraft(patch);
  }

  protected confirmDeleteCategory(category: ManagementCategory): void {
    if (category.hasChildren) {
      this.toastService.warning('Danh mục đang có danh mục con. Hãy chuyển hoặc xóa danh mục con trước.');
      return;
    }

    this.confirmService
      .open({
        title: 'Xóa danh mục sản phẩm',
        content: `Bạn có chắc muốn xóa danh mục ${category.categoryName}?`,
      })
      .pipe(
        take(1),
        filter(Boolean)
      )
      .subscribe(() => this.store.deleteCategory(category.id));
  }

  protected categoryLabel(category: ManagementCategory): string {
    return category.shortName?.trim() || category.categoryName;
  }

  protected parentOptionLabel(category: ManagementCategory): string {
    return `${'— '.repeat(category.depth)}${this.categoryLabel(category)}`;
  }

  protected handleDialogVisibility(visible: boolean): void {
    if (!visible) {
      this.store.closeDialog();
    }
  }

  protected trackCategory(_: number, category: ManagementCategory): string {
    return category.id;
  }
}
