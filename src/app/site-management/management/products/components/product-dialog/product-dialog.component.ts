import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideCheck,
  LucideInfo,
  LucidePlus,
  LucideTrash,
} from '@lucide/angular';
import { DialogModule } from 'primeng/dialog';
import {
  ManagementProductCategory,
  ManagementProductGroup,
  ManagementProductFormErrors,
  ProductFormValue,
  ProductVariantUpsertRequest,
} from '../../data-access/models/management-product.models';
import { ManagementProductService } from '../../data-access/services/management-product.service';

@Component({
  selector: 'app-product-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, LucideCheck, LucideInfo, LucidePlus, LucideTrash],
  templateUrl: './product-dialog.component.html',
  styleUrl: './product-dialog.component.css',
})
export class ProductDialogComponent {
  protected readonly activeTab = signal<'basic' | 'specs' | 'variants'>('basic');
  protected readonly groups = signal<ManagementProductGroup[]>([]);
  protected readonly formState = signal<ProductFormValue>({
    productName: '',
    productGroupId: null,
    categoryIds: [],
    representativeImageKey: null,
    imageKeys: [],
    descriptionRaw: '',
    specificationsRaw: '',
    compatibilityRaw: '',
    boxContentsRaw: '',
    supportInfoRaw: '',
    variants: [],
  });

  // For adding a new variant
  protected readonly newVariant = signal<ProductVariantUpsertRequest>(this.createEmptyVariant());

  readonly visible = input.required<boolean>();
  readonly mode = input.required<'create' | 'edit'>();
  readonly draft = input.required<ProductFormValue | null>();
  readonly categories = input.required<ManagementProductCategory[]>();
  readonly errors = input.required<ManagementProductFormErrors>();
  readonly saving = input.required<boolean>();
  readonly loadingDetail = input.required<boolean>();

  readonly close = output<void>();
  readonly save = output<ProductFormValue>();
  readonly draftChange = output<Partial<ProductFormValue>>();

  private readonly productService = inject(ManagementProductService);

  protected readonly title = computed(() =>
    this.mode() === 'edit' ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'
  );

  protected readonly description = computed(() =>
    this.mode() === 'edit'
      ? 'Cập nhật thông tin chi tiết, đặc tả kỹ thuật và các biến thể sản phẩm.'
      : 'Tạo sản phẩm công nghệ mới trong hệ thống.'
  );

  constructor() {
    this.productService
      .getProductGroups({ page: 0, size: 100, sort: 'name,asc', keyword: '', activeFilter: 'active' })
      .subscribe({
        next: page => this.groups.set(page.groups),
        error: () => this.groups.set([]),
      });

    effect(() => {
      const visible = this.visible();
      const currentDraft = this.draft();
      if (visible && currentDraft) {
        untracked(() => {
          this.formState.set({
            productName: currentDraft.productName || '',
            productGroupId: currentDraft.productGroupId || null,
            categoryIds: currentDraft.categoryIds ? [...currentDraft.categoryIds] : [],
            representativeImageKey: currentDraft.representativeImageKey || null,
            imageKeys: currentDraft.imageKeys ? [...currentDraft.imageKeys] : [],
            descriptionRaw: currentDraft.descriptionRaw || '',
            specificationsRaw: currentDraft.specificationsRaw || '',
            compatibilityRaw: currentDraft.compatibilityRaw || '',
            boxContentsRaw: currentDraft.boxContentsRaw || '',
            supportInfoRaw: currentDraft.supportInfoRaw || '',
            variants: currentDraft.variants ? [...currentDraft.variants] : [],
          });
          this.activeTab.set('basic');
          this.newVariant.set(this.createEmptyVariant());
        });
      }
    });
  }

  protected setTab(tab: 'basic' | 'specs' | 'variants'): void {
    this.activeTab.set(tab);
  }

  protected onFieldChange(patch: Partial<ProductFormValue>): void {
    this.formState.update(state => ({ ...state, ...patch }));
    this.draftChange.emit(patch);
  }

  protected onCategoryToggle(categoryId: string): void {
    const current = this.formState().categoryIds;
    const next = current.includes(categoryId)
      ? current.filter(id => id !== categoryId)
      : [...current, categoryId];

    this.onFieldChange({ categoryIds: next });
  }

  protected isCategorySelected(categoryId: string): boolean {
    return this.formState().categoryIds.includes(categoryId);
  }

  protected get imageKeysRaw(): string {
    return this.formState().imageKeys.join('\n');
  }

  protected onImageKeysChange(value: string): void {
    const keys = value
      .split(/\r?\n/)
      .map(k => k.trim())
      .filter(Boolean);
    this.onFieldChange({ imageKeys: keys });
  }

  // --- Variants Management ---

  protected createEmptyVariant(): ProductVariantUpsertRequest {
    return {
      originalPrice: 0,
      salePrice: null,
      name: 'US Plug',
      nameColor: 'GunMetal',
      colorCode: '#5A5A5A',
      saleStartAt: null,
      saleEndAt: null,
      stockQuantity: 50,
    };
  }

  protected onNewVariantFieldChange(patch: Partial<ProductVariantUpsertRequest>): void {
    this.newVariant.update(v => ({ ...v, ...patch }));
  }

  protected addVariant(): void {
    const v = this.newVariant();
    if (!v.originalPrice || v.originalPrice <= 0) {
      alert('Vui lòng nhập giá gốc hợp lệ cho biến thể.');
      return;
    }
    if (v.stockQuantity < 0) {
      alert('Số lượng tồn kho không hợp lệ.');
      return;
    }

    const currentVariants = this.formState().variants;
    this.onFieldChange({ variants: [...currentVariants, { ...v }] });
    this.newVariant.set(this.createEmptyVariant());
  }

  protected removeVariant(index: number): void {
    const nextVariants = this.formState().variants.filter((_, i) => i !== index);
    this.onFieldChange({ variants: nextVariants });
  }

  protected onSave(): void {
    const state = this.formState();
    if (!state.productName.trim()) {
      alert('Vui lòng nhập tên sản phẩm.');
      return;
    }
    if (state.categoryIds.length === 0) {
      alert('Vui lòng chọn ít nhất một danh mục.');
      return;
    }
    if (state.variants.length === 0) {
      alert('Vui lòng thêm ít nhất một biến thể sản phẩm.');
      return;
    }

    this.save.emit(state);
  }
}
