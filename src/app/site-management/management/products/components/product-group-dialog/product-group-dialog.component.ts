import { Component, computed, input, output, signal } from '@angular/core';
import {
  LucideCheck,
  LucidePackage,
  LucideSearch,
  LucideX,
} from '@lucide/angular';
import { DialogModule } from 'primeng/dialog';
import type {
  ManagementProductGroupDialogMode,
} from '../../data-access/store/management-product-groups.store';
import type {
  ManagementProductGroupDraft,
  ManagementProductGroupFormErrors,
  ManagementProductOption,
} from '../../data-access/models/management-product.models';

@Component({
  selector: 'app-product-group-dialog',
  standalone: true,
  imports: [DialogModule, LucideCheck, LucidePackage, LucideSearch, LucideX],
  templateUrl: './product-group-dialog.component.html',
  styleUrl: './product-group-dialog.component.css',
})
export class ProductGroupDialogComponent {
  protected readonly productSearch = signal('');

  readonly visible = input.required<boolean>();
  readonly mode = input.required<ManagementProductGroupDialogMode>();
  readonly draft = input.required<ManagementProductGroupDraft | null>();
  readonly productOptions = input.required<ManagementProductOption[]>();
  readonly errors = input.required<ManagementProductGroupFormErrors>();
  readonly saving = input.required<boolean>();

  readonly close = output<void>();
  readonly save = output<void>();
  readonly draftChange = output<Partial<ManagementProductGroupDraft>>();
  readonly productToggle = output<string>();

  protected readonly title = computed(() =>
    this.mode() === 'edit' ? 'Chinh sua nhom san pham' : 'Them nhom san pham moi'
  );

  protected readonly description = computed(() =>
    this.mode() === 'edit'
      ? 'Cap nhat ten nhom va danh sach san pham lien quan.'
      : 'Tao phan loai moi cho danh muc san pham.'
  );

  protected readonly filteredProductOptions = computed(() => {
    const keyword = this.productSearch().trim().toLowerCase();

    if (!keyword) {
      return this.productOptions();
    }

    return this.productOptions().filter(
      option =>
        option.name.toLowerCase().includes(keyword) ||
        option.sku.toLowerCase().includes(keyword) ||
        option.categoryName.toLowerCase().includes(keyword)
    );
  });

  protected readonly selectedProductOptions = computed(() => {
    const selectedIds = new Set(this.draft()?.productIds ?? []);

    return this.productOptions().filter(option => selectedIds.has(option.productId));
  });

  protected isProductSelected(productId: string): boolean {
    return this.draft()?.productIds.includes(productId) ?? false;
  }

  protected onNameInput(event: Event): void {
    this.draftChange.emit({ name: readInputValue(event) });
  }

  protected onActiveChange(event: Event): void {
    this.draftChange.emit({ active: event.target instanceof HTMLInputElement && event.target.checked });
  }

  protected onProductSearchInput(event: Event): void {
    this.productSearch.set(readInputValue(event));
  }
}

function readInputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : '';
}
