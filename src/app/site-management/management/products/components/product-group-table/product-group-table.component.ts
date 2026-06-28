import { HasPermissionDirective } from '../../../../../core/permissions/has-permission.directive';
import { DecimalPipe } from '@angular/common';
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideHeadphones,
  LucideKeyboard,
  LucideMonitor,
  LucideMouse,
  LucidePackage,
  LucidePencil,
  LucideTrash2,
} from '@lucide/angular';
import { ManagementProductGroup } from '../../data-access/models/management-product.models';

@Component({
  selector: 'app-product-group-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    HasPermissionDirective,
    DecimalPipe,
    LucideChevronLeft,
    LucideChevronRight,
    LucideHeadphones,
    LucideKeyboard,
    LucideMonitor,
    LucideMouse,
    LucidePackage,
    LucidePencil,
    LucideTrash2,
  ],
  templateUrl: './product-group-table.component.html',
  styleUrl: './product-group-table.component.css',
})
export class ProductGroupTableComponent {
  readonly groups = input.required<ManagementProductGroup[]>();
  readonly loading = input.required<boolean>();
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalElements = input.required<number>();
  readonly pageStart = input.required<number>();
  readonly pageEnd = input.required<number>();
  readonly canGoPrevious = input.required<boolean>();
  readonly canGoNext = input.required<boolean>();

  readonly editGroup = output<ManagementProductGroup>();
  readonly deleteGroup = output<ManagementProductGroup>();
  readonly pageChange = output<number>();

  protected readonly skeletonRows = Array.from({ length: 4 });
  protected readonly pageSlots = Array.from({ length: 5 }, (_, index) => index);

  protected getPageNumber(slot: number): number | null {
    const totalPages = this.totalPages();

    if (totalPages <= 0) {
      return null;
    }

    const start = Math.min(Math.max(this.page() - 2, 0), Math.max(totalPages - 5, 0));
    const page = start + slot;

    return page < totalPages ? page : null;
  }
}
