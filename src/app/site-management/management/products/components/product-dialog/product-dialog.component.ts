import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, OnDestroy, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideCheck,
  LucideInfo,
  LucidePlus,
  LucideTrash,
  LucideUpload,
} from '@lucide/angular';
import { DialogModule } from 'primeng/dialog';
import { firstValueFrom } from 'rxjs';
import { RichTextEditorComponent } from '../../../../../shared/components/rich-text-editor/rich-text-editor.component';
import {
  ManagementProductCategory,
  ManagementProductGroup,
  ManagementProductFormErrors,
  ProductFormValue,
  ProductVariantUpsertRequest,
} from '../../data-access/models/management-product.models';
import { ManagementProductService } from '../../data-access/services/management-product.service';

interface ProductImageItem {
  key: string;
  url: string;
}

@Component({
  selector: 'app-product-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    LucideCheck,
    LucideInfo,
    LucidePlus,
    LucideTrash,
    LucideUpload,
    RichTextEditorComponent,
  ],
  templateUrl: './product-dialog.component.html',
  styleUrl: './product-dialog.component.css',
})
export class ProductDialogComponent implements OnDestroy {
  protected readonly activeTab = signal<'basic' | 'specs' | 'variants'>('basic');
  protected readonly groups = signal<ManagementProductGroup[]>([]);
  protected readonly formState = signal<ProductFormValue>({
    productName: '',
    productGroupId: null,
    categoryIds: [],
    representativeImageKey: null,
    imageKeys: [],
    productImageUrls: [],
    specificationsRaw: '',
    compatibilityRaw: '',
    boxContentsRaw: '',
    supportInfoRaw: '',
    variants: [],
  });

  // For adding a new variant
  protected readonly newVariant = signal<ProductVariantUpsertRequest>(this.createEmptyVariant());
  protected readonly uploadingImages = signal(false);

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
  private readonly localObjectUrls = new Set<string>();
  private hydratedMode: 'create' | 'edit' | null = null;

  protected readonly imageItems = computed<ProductImageItem[]>(() => {
    const state = this.formState();
    return state.imageKeys.map((key, index) => ({
      key,
      url: state.productImageUrls[index] || '',
    }));
  });

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
      const mode = this.mode();
      if (!visible) {
        untracked(() => {
          this.hydratedMode = null;
        });
        return;
      }

      if (visible && currentDraft && this.hydratedMode !== mode) {
        untracked(() => {
          this.formState.set({
            productName: currentDraft.productName || '',
            productGroupId: currentDraft.productGroupId || null,
            categoryIds: currentDraft.categoryIds ? [...currentDraft.categoryIds] : [],
            representativeImageKey: currentDraft.representativeImageKey || null,
            imageKeys: currentDraft.imageKeys ? [...currentDraft.imageKeys] : [],
            productImageUrls: currentDraft.productImageUrls ? [...currentDraft.productImageUrls] : [],
            specificationsRaw: currentDraft.specificationsRaw || '',
            compatibilityRaw: currentDraft.compatibilityRaw || '',
            boxContentsRaw: currentDraft.boxContentsRaw || '',
            supportInfoRaw: currentDraft.supportInfoRaw || '',
            variants: currentDraft.variants ? [...currentDraft.variants] : [],
          });
          this.activeTab.set('basic');
          this.newVariant.set(this.createEmptyVariant());
          this.hydratedMode = mode;
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

  async onImageFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    if (files.length === 0) {
      return;
    }

    this.uploadingImages.set(true);

    try {
      const uploadedItems: ProductImageItem[] = [];
      for (const file of files) {
        const presign = await firstValueFrom(this.productService.requestProductImageUploadPresign(file));
        await firstValueFrom(this.productService.uploadProductImage(presign, file));
        const previewUrl = URL.createObjectURL(file);
        this.localObjectUrls.add(previewUrl);
        uploadedItems.push({
          key: presign.fileKey,
          url: previewUrl,
        });
      }

      const state = this.formState();
      const imageKeys = [...state.imageKeys, ...uploadedItems.map(item => item.key)];
      const productImageUrls = [...state.productImageUrls, ...uploadedItems.map(item => item.url)];
      this.onFieldChange({
        imageKeys,
        productImageUrls,
        representativeImageKey: state.representativeImageKey || imageKeys[0] || null,
      });
    } catch {
      alert('KhÃ´ng thá»ƒ táº£i áº£nh sáº£n pháº©m lÃªn. Vui lÃ²ng thá»­ láº¡i.');
    } finally {
      this.uploadingImages.set(false);
    }
  }

  protected removeImage(key: string): void {
    const state = this.formState();
    const index = state.imageKeys.indexOf(key);
    if (index < 0) {
      return;
    }

    const imageKeys = state.imageKeys.filter((_, i) => i !== index);
    const productImageUrls = state.productImageUrls.filter((_, i) => i !== index);
    const removedUrl = state.productImageUrls[index];
    if (removedUrl && this.localObjectUrls.has(removedUrl)) {
      URL.revokeObjectURL(removedUrl);
      this.localObjectUrls.delete(removedUrl);
    }
    const representativeImageKey =
      state.representativeImageKey === key ? imageKeys[0] || null : state.representativeImageKey;

    this.onFieldChange({ imageKeys, productImageUrls, representativeImageKey });
  }

  protected setRepresentativeImage(key: string): void {
    this.onFieldChange({ representativeImageKey: key });
  }

  protected isRepresentativeImage(key: string): boolean {
    return this.formState().representativeImageKey === key;
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

  ngOnDestroy(): void {
    this.localObjectUrls.forEach(url => URL.revokeObjectURL(url));
    this.localObjectUrls.clear();
  }
}
