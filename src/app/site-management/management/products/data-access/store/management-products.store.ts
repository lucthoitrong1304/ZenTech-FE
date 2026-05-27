import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeEntity, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, forkJoin, map, pipe, switchMap, tap } from 'rxjs';
import { ManagementProductEvent, ManagementProductEventType } from '../models/management-product.event';
import {
  ManagementProduct,
  ManagementProductCategory,
  ManagementProductPage,
  ManagementProductQuery,
  ManagementProductStats,
  ProductFormValue,
  ProductCreateRequest,
  ProductUpdateRequest,
  ProductManagementDetailResponse,
  ManagementProductFormErrors,
  ProductVariantUpsertRequest,
  MarkdownContentRequest,
  MarkdownSectionRequest,
  MarkdownBulletRequest,
} from '../models/management-product.models';
import { ManagementProductService } from '../services/management-product.service';

const DEFAULT_QUERY: ManagementProductQuery = {
  page: 0,
  size: 4,
  sort: 'name,asc',
  keyword: '',
  categoryId: 'all',
  stockStatus: 'all',
};

const PRODUCT_ENTITY_CONFIG = {
  collection: 'product',
  selectId: (product: ManagementProduct) => product.productId,
} as const;

interface ManagementProductsUiState {
  query: ManagementProductQuery;
  totalElements: number;
  totalPages: number;
  last: boolean;
  loading: boolean;
  categories: ManagementProductCategory[];
  stats: ManagementProductStats;
  successMessage: string | null;
  errorMessage: string | null;
  dialogVisible: boolean;
  dialogMode: 'create' | 'edit';
  editingProductId: string | null;
  loadingDetail: boolean;
  saving: boolean;
  formValue: ProductFormValue | null;
  formErrors: ManagementProductFormErrors;
}

const INITIAL_STATE: ManagementProductsUiState = {
  query: DEFAULT_QUERY,
  totalElements: 0,
  totalPages: 0,
  last: true,
  loading: false,
  categories: [],
  stats: {
    totalProducts: 0,
    outOfStock: 0,
    inventoryValue: 0,
    lowStock: 0,
  },
  successMessage: null,
  errorMessage: null,
  dialogVisible: false,
  dialogMode: 'create',
  editingProductId: null,
  loadingDetail: false,
  saving: false,
  formValue: null,
  formErrors: {},
};

export function createEmptyProductFormValue(): ProductFormValue {
  return {
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
  };
}

export function mapDetailResponseToFormValue(detail: ProductManagementDetailResponse): ProductFormValue {
  return {
    productName: detail.productName,
    productGroupId: detail.productGroup ? detail.productGroup.id : null,
    categoryIds: detail.categories.map(c => c.id),
    representativeImageKey: detail.representativeImageKey,
    imageKeys: detail.imageKeys || [],
    descriptionRaw: detail.description || '',
    specificationsRaw: detail.specifications || '',
    compatibilityRaw: detail.compatibility || '',
    boxContentsRaw: detail.boxContents || '',
    supportInfoRaw: detail.supportInfo || '',
    variants: detail.variants.map(v => ({
      id: v.id,
      originalPrice: v.originalPrice,
      salePrice: v.salePrice,
      name: v.name || '',
      nameColor: v.nameColor || '',
      colorCode: v.colorCode || '',
      saleStartAt: v.saleStartAt,
      saleEndAt: v.saleEndAt,
      stockQuantity: v.stockQuantity,
    })),
  };
}

export function parseMarkdownToRequest(markdown: string): MarkdownContentRequest {
  if (!markdown || !markdown.trim()) {
    return { sections: [] };
  }

  const sections: MarkdownSectionRequest[] = [];
  const lines = markdown.split(/\r?\n/);
  let currentSection: MarkdownSectionRequest | null = null;
  let currentParagraphs: string[] = [];
  let currentBullets: MarkdownBulletRequest[] = [];

  const flushSection = (): void => {
    if (currentSection) {
      currentSection.paragraphs = currentParagraphs.length > 0 ? currentParagraphs : null;
      currentSection.bullets = currentBullets.length > 0 ? currentBullets : null;
      sections.push(currentSection);
    }
    currentSection = null;
    currentParagraphs = [];
    currentBullets = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith('#')) {
      flushSection();
      const heading = trimmed.replace(/^#+\s+/, '');
      currentSection = {
        heading,
        paragraphs: null,
        bullets: null,
      };
    } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      if (!currentSection) {
        currentSection = { heading: null, paragraphs: null, bullets: null };
      }
      const bulletContent = trimmed.replace(/^[-*]\s+/, '');
      const boldMatch = bulletContent.match(/^\*\*(.*?)\*\*[:\s]*(.*)$/);
      if (boldMatch) {
        currentBullets.push({
          label: boldMatch[1].trim(),
          value: boldMatch[2].trim(),
        });
      } else {
        currentBullets.push({
          label: null,
          value: bulletContent,
        });
      }
    } else {
      if (!currentSection) {
        currentSection = { heading: null, paragraphs: null, bullets: null };
      }
      currentParagraphs.push(trimmed);
    }
  }

  flushSection();
  return { sections };
}


export const ManagementProductsStore = signalStore(
  withState<ManagementProductsUiState>(INITIAL_STATE),
  withEntities<ManagementProduct, 'product'>({
    entity: {} as ManagementProduct,
    collection: 'product',
  }),
  withComputed(({ productEntities, query, totalElements, totalPages }) => ({
    products: computed(() => productEntities()),
    hasProducts: computed(() => productEntities().length > 0),
    isEmpty: computed(() => productEntities().length === 0),
    pageStart: computed(() => (totalElements() === 0 ? 0 : query().page * query().size + 1)),
    pageEnd: computed(() => Math.min((query().page + 1) * query().size, totalElements())),
    canGoPrevious: computed(() => query().page > 0),
    canGoNext: computed(() => query().page + 1 < totalPages()),
    activeFilterCount: computed(() => {
      let count = 0;

      if (query().keyword.trim()) {
        count += 1;
      }

      if (query().categoryId !== 'all') {
        count += 1;
      }

      if (query().stockStatus !== 'all') {
        count += 1;
      }

      return count;
    }),
  })),
  withMethods((store, productService = inject(ManagementProductService)) => {
    const applyProductsPage = (page: ManagementProductPage): void => {
      patchState(
        store,
        setAllEntities(page.products, PRODUCT_ENTITY_CONFIG),
        {
          query: {
            ...store.query(),
            page: page.page,
            size: page.size,
          },
          totalElements: page.totalElements,
          totalPages: page.totalPages,
          last: page.last,
          loading: false,
          errorMessage: null,
        }
      );
    };

    const handleEvent = (event: ManagementProductEvent): void => {
      switch (event.type) {
        case ManagementProductEventType.ProductsLoadStarted:
          patchState(store, { loading: true, errorMessage: null });
          break;

        case ManagementProductEventType.ProductsLoadSucceeded:
          applyProductsPage(event.page);
          break;

        case ManagementProductEventType.ProductsLoadFailed:
          patchState(store, {
            loading: false,
            totalElements: 0,
            totalPages: 0,
            last: true,
            errorMessage: 'Khong the tai danh sach san pham. Vui long thu lai.',
          });
          break;

        case ManagementProductEventType.StatsLoadSucceeded:
          patchState(store, { stats: event.stats });
          break;

        case ManagementProductEventType.SearchKeywordChanged:
          patchState(store, {
            query: {
              ...store.query(),
              keyword: event.keyword,
              page: 0,
            },
          });
          break;

        case ManagementProductEventType.CategoryFilterChanged:
          patchState(store, {
            query: {
              ...store.query(),
              categoryId: event.categoryId,
              page: 0,
            },
          });
          break;

        case ManagementProductEventType.StockFilterChanged:
          patchState(store, {
            query: {
              ...store.query(),
              stockStatus: event.stockStatus,
              page: 0,
            },
          });
          break;

        case ManagementProductEventType.SortChanged:
          patchState(store, {
            query: {
              ...store.query(),
              sort: event.sort,
              page: 0,
            },
          });
          break;

        case ManagementProductEventType.FiltersApplied:
          patchState(store, { query: { ...store.query(), page: 0 } });
          break;

        case ManagementProductEventType.FiltersReset:
          patchState(store, { query: { ...event.query } });
          break;

        case ManagementProductEventType.PageChanged:
          patchState(store, {
            query: {
              ...store.query(),
              page: Math.max(0, Math.min(event.page, Math.max(store.totalPages() - 1, 0))),
            },
          });
          break;

        case ManagementProductEventType.ProductDeleted:
          patchState(
            store,
            removeEntity(event.productId, PRODUCT_ENTITY_CONFIG),
            {
              totalElements: Math.max(0, store.totalElements() - 1),
              successMessage: 'Da xoa san pham mock khoi danh sach.',
            }
          );
          break;

        case ManagementProductEventType.ProductDeleteFailed:
          patchState(store, { errorMessage: 'Khong the xoa san pham luc nay.' });
          break;

        case ManagementProductEventType.MessagesCleared:
          patchState(store, { successMessage: null, errorMessage: null });
          break;

        case ManagementProductEventType.CreateClicked:
          patchState(store, {
            dialogVisible: true,
            dialogMode: 'create',
            editingProductId: null,
            formValue: createEmptyProductFormValue(),
            formErrors: {},
          });
          break;

        case ManagementProductEventType.EditClicked:
          patchState(store, {
            dialogVisible: true,
            dialogMode: 'edit',
            editingProductId: event.productId,
            loadingDetail: true,
            formValue: null,
            formErrors: {},
          });
          break;

        case ManagementProductEventType.DetailLoadStarted:
          patchState(store, { loadingDetail: true });
          break;

        case ManagementProductEventType.DetailLoadSucceeded:
          patchState(store, {
            loadingDetail: false,
            formValue: mapDetailResponseToFormValue(event.detail),
          });
          break;

        case ManagementProductEventType.DetailLoadFailed:
          patchState(store, {
            loadingDetail: false,
            dialogVisible: false,
            errorMessage: 'Khong the tai chi tiet san pham.',
          });
          break;

        case ManagementProductEventType.DialogClosed:
          patchState(store, {
            dialogVisible: false,
            editingProductId: null,
            formValue: null,
            formErrors: {},
          });
          break;

        case ManagementProductEventType.FormValueChanged: {
          const current = store.formValue();
          if (current) {
            patchState(store, {
              formValue: {
                ...current,
                ...event.patch,
              },
            });
          }
          break;
        }

        case ManagementProductEventType.SubmitClicked:
          patchState(store, { saving: true, formErrors: {} });
          break;

        case ManagementProductEventType.CreateSucceeded:
          patchState(store, {
            saving: false,
            dialogVisible: false,
            successMessage: `Da them san pham ${event.detail.productName} thanh cong.`,
          });
          break;

        case ManagementProductEventType.UpdateSucceeded:
          patchState(store, {
            saving: false,
            dialogVisible: false,
            successMessage: `Da cap nhat san pham ${event.detail.productName} thanh cong.`,
          });
          break;

        case ManagementProductEventType.SaveFailed:
          patchState(store, {
            saving: false,
            formErrors: { submit: event.error },
          });
          break;
      }
    };

    const loadProducts = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: ManagementProductEventType.ProductsLoadStarted })),
        switchMap(() =>
          forkJoin({
            page: productService.getProducts(store.query()),
            stats: productService.getProductStats(),
            categories: productService.getCategories(),
          }).pipe(
            tap({
              next: ({ page, stats, categories }) => {
                patchState(store, { categories });
                handleEvent({ type: ManagementProductEventType.StatsLoadSucceeded, stats });
                handleEvent({ type: ManagementProductEventType.ProductsLoadSucceeded, page });
              },
              error: () => handleEvent({ type: ManagementProductEventType.ProductsLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const deleteProduct = rxMethod<string>(
      pipe(
        switchMap(productId =>
          productService.deleteProduct(productId).pipe(
            tap({
              next: deletedProductId =>
                handleEvent({
                  type: ManagementProductEventType.ProductDeleted,
                  productId: deletedProductId,
                }),
              error: () => handleEvent({ type: ManagementProductEventType.ProductDeleteFailed }),
            }),
            switchMap(() => productService.getProductStats()),
            tap(stats => handleEvent({ type: ManagementProductEventType.StatsLoadSucceeded, stats })),
            map(() => undefined),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const loadProductDetail = rxMethod<string>(
      pipe(
        tap(() => handleEvent({ type: ManagementProductEventType.DetailLoadStarted })),
        switchMap(productId =>
          productService.getProductDetail(productId).pipe(
            tap({
              next: detail =>
                handleEvent({ type: ManagementProductEventType.DetailLoadSucceeded, detail }),
              error: () =>
                handleEvent({ type: ManagementProductEventType.DetailLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const saveProduct = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: ManagementProductEventType.SubmitClicked })),
        switchMap(() => {
          const form = store.formValue();
          const mode = store.dialogMode();
          const editingId = store.editingProductId();

          if (!form) {
            handleEvent({ type: ManagementProductEventType.SaveFailed, error: 'Thong tin form khong hop le.' });
            return EMPTY;
          }

          const payload: ProductCreateRequest = {
            productName: form.productName,
            productGroupId: form.productGroupId,
            categoryIds: form.categoryIds,
            representativeImageKey: form.representativeImageKey,
            imageKeys: form.imageKeys,
            description: parseMarkdownToRequest(form.descriptionRaw),
            specifications: parseMarkdownToRequest(form.specificationsRaw),
            compatibility: parseMarkdownToRequest(form.compatibilityRaw),
            boxContents: parseMarkdownToRequest(form.boxContentsRaw),
            supportInfo: parseMarkdownToRequest(form.supportInfoRaw),
            variants: form.variants,
          };

          if (mode === 'edit' && editingId) {
            const updatePayload: ProductUpdateRequest = {
              ...payload,
              clearProductGroup: !payload.productGroupId,
              clearRepresentativeImage: !payload.representativeImageKey,
            };
            return productService.updateProduct(editingId, updatePayload).pipe(
              tap({
                next: detail => {
                  handleEvent({ type: ManagementProductEventType.UpdateSucceeded, detail });
                },
                error: (err: unknown) => {
                  const errorResponse = err as { message?: string };
                  const errMsg = errorResponse?.message || 'Khong the cap nhat san pham. Vui long thu lai.';
                  handleEvent({ type: ManagementProductEventType.SaveFailed, error: errMsg });
                },
              }),
              switchMap(() => productService.getProductStats()),
              tap(stats => handleEvent({ type: ManagementProductEventType.StatsLoadSucceeded, stats })),
              switchMap(() => productService.getProducts(store.query())),
              tap(page => handleEvent({ type: ManagementProductEventType.ProductsLoadSucceeded, page })),
              map(() => undefined),
              catchError(() => EMPTY)
            );
          } else {
            return productService.createProduct(payload).pipe(
              tap({
                next: detail => {
                  handleEvent({ type: ManagementProductEventType.CreateSucceeded, detail });
                },
                error: (err: unknown) => {
                  const errorResponse = err as { message?: string };
                  const errMsg = errorResponse?.message || 'Khong the tao san pham. Vui long thu lai.';
                  handleEvent({ type: ManagementProductEventType.SaveFailed, error: errMsg });
                },
              }),
              switchMap(() => productService.getProductStats()),
              tap(stats => handleEvent({ type: ManagementProductEventType.StatsLoadSucceeded, stats })),
              switchMap(() => productService.getProducts(store.query())),
              tap(page => handleEvent({ type: ManagementProductEventType.ProductsLoadSucceeded, page })),
              map(() => undefined),
              catchError(() => EMPTY)
            );
          }
        })
      )
    );

    return {
      dispatch: handleEvent,
      loadProducts,
      deleteProduct,
      setKeyword(keyword: string): void {
        handleEvent({ type: ManagementProductEventType.SearchKeywordChanged, keyword });
      },
      setCategoryFilter(categoryId: string): void {
        handleEvent({ type: ManagementProductEventType.CategoryFilterChanged, categoryId });
      },
      setStockFilter(stockStatus: ManagementProductQuery['stockStatus']): void {
        handleEvent({ type: ManagementProductEventType.StockFilterChanged, stockStatus });
      },
      setSort(sort: ManagementProductQuery['sort']): void {
        handleEvent({ type: ManagementProductEventType.SortChanged, sort });
      },
      applyFilters(): void {
        handleEvent({ type: ManagementProductEventType.FiltersApplied });
        loadProducts();
      },
      resetFilters(): void {
        handleEvent({ type: ManagementProductEventType.FiltersReset, query: DEFAULT_QUERY });
        loadProducts();
      },
      goToPage(page: number): void {
        handleEvent({ type: ManagementProductEventType.PageChanged, page });
        loadProducts();
      },
      clearMessages(): void {
        handleEvent({ type: ManagementProductEventType.MessagesCleared });
      },
      openCreateDialog(): void {
        handleEvent({ type: ManagementProductEventType.CreateClicked });
      },
      openEditDialog(productId: string): void {
        handleEvent({ type: ManagementProductEventType.EditClicked, productId });
        loadProductDetail(productId);
      },
      updateFormValue(patch: Partial<ProductFormValue>): void {
        handleEvent({ type: ManagementProductEventType.FormValueChanged, patch });
      },
      closeDialog(): void {
        handleEvent({ type: ManagementProductEventType.DialogClosed });
      },
      submitProductForm(): void {
        saveProduct();
      },
    };
  })
);
