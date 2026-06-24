import { computed, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeEntity, setAllEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, forkJoin, map, pipe, switchMap, tap } from 'rxjs';
import { MarketingEvent, MarketingEventType } from '../models/marketing.event';
import {
  ManagementCoupon,
  ManagementCouponQuery,
  ManagementCouponPage,
  CustomerVoucherDetail,
  CustomerVoucherQuery,
  CustomerVoucherPage,
  MarketingStats,
  CustomerSummary,
  CouponFormValue,
  CouponType,
  CustomerVoucherStatus,
} from '../models/marketing.models';
import { MarketingService } from '../services/marketing.service';

const DEFAULT_COUPONS_QUERY: ManagementCouponQuery = {
  page: 0,
  size: 5,
  sort: 'code,asc',
  keyword: '',
  type: 'all',
  active: 'all',
};

const DEFAULT_VOUCHERS_QUERY: CustomerVoucherQuery = {
  page: 0,
  size: 5,
  sort: 'issuedAt,desc',
  keyword: '',
  couponCode: '',
  status: 'all',
};

const COUPON_ENTITY_CONFIG = {
  collection: 'coupon',
  selectId: (coupon: ManagementCoupon) => coupon.id,
} as const;

interface MarketingUiState {
  couponsQuery: ManagementCouponQuery;
  totalCoupons: number;
  totalCouponsPages: number;
  couponsLoading: boolean;
  
  vouchers: CustomerVoucherDetail[];
  vouchersQuery: CustomerVoucherQuery;
  totalVouchers: number;
  totalVouchersPages: number;
  vouchersLoading: boolean;

  activeTab: number;
  stats: MarketingStats;
  customers: CustomerSummary[];
  
  successMessage: string | null;
  errorMessage: string | null;
  
  dialogVisible: boolean;
  dialogMode: 'create' | 'edit';
  editingCouponId: string | null;
  loadingDetail: boolean;
  saving: boolean;
  formValue: CouponFormValue | null;

  issueDialogVisible: boolean;
  issueFormValue: { couponId: string; customerId: string | null; customerIds: string[] } | null;
  issueSaving: boolean;
}

const INITIAL_STATE: MarketingUiState = {
  couponsQuery: DEFAULT_COUPONS_QUERY,
  totalCoupons: 0,
  totalCouponsPages: 0,
  couponsLoading: false,
  
  vouchers: [],
  vouchersQuery: DEFAULT_VOUCHERS_QUERY,
  totalVouchers: 0,
  totalVouchersPages: 0,
  vouchersLoading: false,

  activeTab: 0,
  stats: {
    totalCoupons: 0,
    activeCoupons: 0,
    totalDiscountGiven: 0,
    redemptionRate: 0,
  },
  customers: [],
  
  successMessage: null,
  errorMessage: null,
  
  dialogVisible: false,
  dialogMode: 'create',
  editingCouponId: null,
  loadingDetail: false,
  saving: false,
  formValue: null,

  issueDialogVisible: false,
  issueFormValue: null,
  issueSaving: false,
};

function formatIsoToLocalDatetime(isoString: string | null): string | null {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return null;
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatLocalDatetimeToIso(localString: string | null): string | null {
  if (!localString) return null;
  const date = new Date(localString);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function createEmptyCouponFormValue(): CouponFormValue {
  return {
    code: '',
    type: CouponType.PERCENTAGE,
    discountValue: 0,
    maxDiscount: 0,
    minOrderAmount: 0,
    startAt: null,
    endAt: null,
    usageLimit: 100,
    active: true,
  };
}

export const MarketingStore = signalStore(
  withState<MarketingUiState>(INITIAL_STATE),
  withEntities<ManagementCoupon, 'coupon'>({
    entity: {} as ManagementCoupon,
    collection: 'coupon',
  }),
  withComputed(({ couponEntities, couponsQuery, totalCoupons, totalCouponsPages, vouchersQuery, totalVouchers, totalVouchersPages }) => ({
    coupons: computed(() => couponEntities()),
    hasCoupons: computed(() => couponEntities().length > 0),
    pageCouponsStart: computed(() => (totalCoupons() === 0 ? 0 : couponsQuery().page * couponsQuery().size + 1)),
    pageCouponsEnd: computed(() => Math.min((couponsQuery().page + 1) * couponsQuery().size, totalCoupons())),
    canCouponsPrevious: computed(() => couponsQuery().page > 0),
    canCouponsNext: computed(() => couponsQuery().page + 1 < totalCouponsPages()),

    pageVouchersStart: computed(() => (totalVouchers() === 0 ? 0 : vouchersQuery().page * vouchersQuery().size + 1)),
    pageVouchersEnd: computed(() => Math.min((vouchersQuery().page + 1) * vouchersQuery().size, totalVouchers())),
    canVouchersPrevious: computed(() => vouchersQuery().page > 0),
    canVouchersNext: computed(() => vouchersQuery().page + 1 < totalVouchersPages()),
    
    activeCouponsFiltersCount: computed(() => {
      let count = 0;
      if (couponsQuery().keyword.trim()) count++;
      if (couponsQuery().type !== 'all') count++;
      if (couponsQuery().active !== 'all') count++;
      return count;
    }),

    activeVouchersFiltersCount: computed(() => {
      let count = 0;
      if (vouchersQuery().keyword.trim()) count++;
      if (vouchersQuery().couponCode.trim()) count++;
      if (vouchersQuery().status !== 'all') count++;
      return count;
    }),
  })),
  withMethods((store, marketingService = inject(MarketingService)) => {
    const handleEvent = (event: MarketingEvent): void => {
      switch (event.type) {
        case MarketingEventType.CouponsLoadStarted:
          patchState(store, { couponsLoading: true, errorMessage: null });
          break;

        case MarketingEventType.CouponsLoadSucceeded:
          patchState(
            store,
            setAllEntities(event.page.content, COUPON_ENTITY_CONFIG),
            {
              totalCoupons: event.page.totalElements,
              totalCouponsPages: event.page.totalPages,
              couponsLoading: false,
            }
          );
          break;

        case MarketingEventType.CouponsLoadFailed:
          patchState(store, {
            couponsLoading: false,
            errorMessage: 'Không thể tải danh sách mã giảm giá. Vui lòng thử lại.',
          });
          break;

        case MarketingEventType.VouchersLoadStarted:
          patchState(store, { vouchersLoading: true, errorMessage: null });
          break;

        case MarketingEventType.VouchersLoadSucceeded:
          patchState(store, {
            vouchers: event.page.content,
            totalVouchers: event.page.totalElements,
            totalVouchersPages: event.page.totalPages,
            vouchersLoading: false,
          });
          break;

        case MarketingEventType.VouchersLoadFailed:
          patchState(store, {
            vouchersLoading: false,
            errorMessage: 'Không thể tải lịch sử phát hành. Vui lòng thử lại.',
          });
          break;

        case MarketingEventType.StatsLoadSucceeded:
          patchState(store, { stats: event.stats });
          break;

        case MarketingEventType.CustomersLoadSucceeded:
          patchState(store, { customers: event.customers });
          break;

        case MarketingEventType.TabChanged:
          patchState(store, { activeTab: event.tabIndex });
          break;

        case MarketingEventType.SearchKeywordChanged:
          patchState(store, {
            couponsQuery: { ...store.couponsQuery(), keyword: event.keyword, page: 0 },
          });
          break;

        case MarketingEventType.TypeFilterChanged:
          patchState(store, {
            couponsQuery: { ...store.couponsQuery(), type: event.couponType, page: 0 },
          });
          break;

        case MarketingEventType.ActiveFilterChanged:
          patchState(store, {
            couponsQuery: { ...store.couponsQuery(), active: event.activeStatus, page: 0 },
          });
          break;

        case MarketingEventType.SortChanged:
          patchState(store, {
            couponsQuery: { ...store.couponsQuery(), sort: event.sort, page: 0 },
          });
          break;

        case MarketingEventType.FiltersApplied:
          patchState(store, { couponsQuery: { ...store.couponsQuery(), page: 0 } });
          break;

        case MarketingEventType.FiltersReset:
          patchState(store, { couponsQuery: event.query });
          break;

        case MarketingEventType.PageChanged:
          patchState(store, {
            couponsQuery: {
              ...store.couponsQuery(),
              page: Math.max(0, Math.min(event.page, Math.max(store.totalCouponsPages() - 1, 0))),
            },
          });
          break;

        case MarketingEventType.VoucherKeywordChanged:
          patchState(store, {
            vouchersQuery: { ...store.vouchersQuery(), keyword: event.keyword, page: 0 },
          });
          break;

        case MarketingEventType.VoucherCouponCodeChanged:
          patchState(store, {
            vouchersQuery: { ...store.vouchersQuery(), couponCode: event.couponCode, page: 0 },
          });
          break;

        case MarketingEventType.VoucherStatusChanged:
          patchState(store, {
            vouchersQuery: { ...store.vouchersQuery(), status: event.status, page: 0 },
          });
          break;

        case MarketingEventType.VoucherFiltersApplied:
          patchState(store, { vouchersQuery: { ...store.vouchersQuery(), page: 0 } });
          break;

        case MarketingEventType.VoucherFiltersReset:
          patchState(store, { vouchersQuery: event.query });
          break;

        case MarketingEventType.VoucherPageChanged:
          patchState(store, {
            vouchersQuery: {
              ...store.vouchersQuery(),
              page: Math.max(0, Math.min(event.page, Math.max(store.totalVouchersPages() - 1, 0))),
            },
          });
          break;

        case MarketingEventType.CreateClicked:
          patchState(store, {
            dialogVisible: true,
            dialogMode: 'create',
            editingCouponId: null,
            formValue: createEmptyCouponFormValue(),
          });
          break;

        case MarketingEventType.EditClicked:
          patchState(store, {
            dialogVisible: true,
            dialogMode: 'edit',
            editingCouponId: event.couponId,
            loadingDetail: true,
          });
          break;

        case MarketingEventType.DetailLoadStarted:
          patchState(store, { loadingDetail: true });
          break;

        case MarketingEventType.DetailLoadSucceeded:
          patchState(store, {
            loadingDetail: false,
            formValue: {
              code: event.detail.code,
              type: event.detail.type,
              discountValue: event.detail.discountValue,
              maxDiscount: event.detail.maxDiscount,
              minOrderAmount: event.detail.minOrderAmount,
              startAt: formatIsoToLocalDatetime(event.detail.startAt),
              endAt: formatIsoToLocalDatetime(event.detail.endAt),
              usageLimit: event.detail.usageLimit,
              active: event.detail.active,
            },
          });
          break;

        case MarketingEventType.DetailLoadFailed:
          patchState(store, {
            loadingDetail: false,
            dialogVisible: false,
            errorMessage: 'Không thể tải thông tin chi tiết mã giảm giá.',
          });
          break;

        case MarketingEventType.DialogClosed:
          patchState(store, {
            dialogVisible: false,
            editingCouponId: null,
            formValue: null,
          });
          break;

        case MarketingEventType.FormValueChanged:
          if (store.formValue()) {
            patchState(store, {
              formValue: { ...store.formValue()!, ...event.patch },
            });
          }
          break;

        case MarketingEventType.SubmitClicked:
          patchState(store, { saving: true, errorMessage: null });
          break;

        case MarketingEventType.CreateSucceeded:
          patchState(
            store,
            {
              saving: false,
              dialogVisible: false,
              successMessage: `Đã tạo mã giảm giá ${event.detail.code} thành công.`,
            }
          );
          break;

        case MarketingEventType.UpdateSucceeded:
          patchState(
            store,
            updateEntity(
              { id: event.detail.id, changes: event.detail },
              COUPON_ENTITY_CONFIG
            ),
            {
              saving: false,
              dialogVisible: false,
              successMessage: `Đã cập nhật mã giảm giá ${event.detail.code} thành công.`,
            }
          );
          break;

        case MarketingEventType.SaveFailed:
          patchState(store, { saving: false, errorMessage: event.error });
          break;

        case MarketingEventType.CouponDeleted:
          patchState(
            store,
            removeEntity(event.couponId, COUPON_ENTITY_CONFIG),
            {
              totalCoupons: Math.max(0, store.totalCoupons() - 1),
              successMessage: 'Đã xóa mã giảm giá thành công.',
            }
          );
          break;

        case MarketingEventType.CouponDeleteFailed:
          patchState(store, { errorMessage: 'Không thể xóa mã giảm giá. Vui lòng thử lại.' });
          break;

        case MarketingEventType.ToggleActiveSucceeded:
          patchState(
            store,
            updateEntity(
              { id: event.detail.id, changes: { active: event.detail.active } },
              COUPON_ENTITY_CONFIG
            )
          );
          break;

        case MarketingEventType.ToggleActiveFailed:
          patchState(store, { errorMessage: 'Không thể cập nhật trạng thái hoạt động.' });
          break;

        case MarketingEventType.IssueVoucherClicked:
          patchState(store, {
            issueDialogVisible: true,
            issueFormValue: {
              couponId: event.couponId ?? '',
              customerId: null,
              customerIds: [],
            },
          });
          break;

        case MarketingEventType.IssueVoucherDialogClosed:
          patchState(store, {
            issueDialogVisible: false,
            issueFormValue: null,
          });
          break;

        case MarketingEventType.IssueFormValueChanged:
          if (store.issueFormValue()) {
            patchState(store, {
              issueFormValue: { ...store.issueFormValue()!, ...event.patch },
            });
          }
          break;

        case MarketingEventType.IssueVoucherSubmitClicked:
          patchState(store, { issueSaving: true, errorMessage: null });
          break;

        case MarketingEventType.IssueVoucherSucceeded:
          patchState(store, {
            issueSaving: false,
            issueDialogVisible: false,
            successMessage: 'Đã phát hành voucher cho khách hàng thành công.',
          });
          break;

        case MarketingEventType.IssueVoucherFailed:
          patchState(store, { issueSaving: false, errorMessage: event.error });
          break;

        case MarketingEventType.VoucherRevoked:
          patchState(store, {
            vouchers: store.vouchers().filter(v => v.id !== event.customerVoucherId),
            totalVouchers: Math.max(0, store.totalVouchers() - 1),
            successMessage: 'Đã thu hồi voucher thành công.',
            errorMessage: null,
          });
          break;

        case MarketingEventType.VoucherRevokeFailed:
          patchState(store, { errorMessage: event.error });
          break;

        case MarketingEventType.MessagesCleared:
          patchState(store, { successMessage: null, errorMessage: null });
          break;
      }
    };

    const loadCoupons = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: MarketingEventType.CouponsLoadStarted })),
        switchMap(() =>
          marketingService.getCoupons(store.couponsQuery()).pipe(
            tap({
              next: page => handleEvent({ type: MarketingEventType.CouponsLoadSucceeded, page }),
              error: () => handleEvent({ type: MarketingEventType.CouponsLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const loadVouchers = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: MarketingEventType.VouchersLoadStarted })),
        switchMap(() =>
          marketingService.getCustomerVouchers(store.vouchersQuery()).pipe(
            tap({
              next: page => handleEvent({ type: MarketingEventType.VouchersLoadSucceeded, page }),
              error: () => handleEvent({ type: MarketingEventType.VouchersLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const loadStats = rxMethod<void>(
      pipe(
        switchMap(() =>
          marketingService.getMarketingStats().pipe(
            tap(stats => handleEvent({ type: MarketingEventType.StatsLoadSucceeded, stats })),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const loadCustomers = rxMethod<void>(
      pipe(
        switchMap(() =>
          marketingService.getCustomers().pipe(
            tap(customers => handleEvent({ type: MarketingEventType.CustomersLoadSucceeded, customers })),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const loadDetail = rxMethod<string>(
      pipe(
        tap(() => handleEvent({ type: MarketingEventType.DetailLoadStarted })),
        switchMap(couponId =>
          marketingService.getCouponDetail(couponId).pipe(
            tap({
              next: detail => handleEvent({ type: MarketingEventType.DetailLoadSucceeded, detail }),
              error: () => handleEvent({ type: MarketingEventType.DetailLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const saveCoupon = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: MarketingEventType.SubmitClicked })),
        switchMap(() => {
          const form = store.formValue();
          const mode = store.dialogMode();
          const editingId = store.editingCouponId();

          if (!form) {
            handleEvent({ type: MarketingEventType.SaveFailed, error: 'Thông tin biểu mẫu không hợp lệ.' });
            return EMPTY;
          }

          const payload = {
            ...form,
            startAt: formatLocalDatetimeToIso(form.startAt),
            endAt: formatLocalDatetimeToIso(form.endAt),
          };

          if (mode === 'edit' && editingId) {
            return marketingService.updateCoupon(editingId, payload).pipe(
              tap({
                next: detail => {
                  handleEvent({ type: MarketingEventType.UpdateSucceeded, detail });
                  loadCoupons();
                  loadStats();
                },
                error: (err: unknown) => {
                  const errorMsg = getErrorMessage(err, 'Không thể cập nhật mã giảm giá.');
                  handleEvent({ type: MarketingEventType.SaveFailed, error: errorMsg });
                },
              }),
              catchError(() => EMPTY)
            );
          } else {
            return marketingService.createCoupon(payload).pipe(
              tap({
                next: detail => {
                  handleEvent({ type: MarketingEventType.CreateSucceeded, detail });
                  loadCoupons();
                  loadStats();
                },
                error: (err: unknown) => {
                  const errorMsg = getErrorMessage(err, 'Không thể tạo mã giảm giá.');
                  handleEvent({ type: MarketingEventType.SaveFailed, error: errorMsg });
                },
              }),
              catchError(() => EMPTY)
            );
          }
        })
      )
    );

    const deleteCoupon = rxMethod<string>(
      pipe(
        switchMap(couponId =>
          marketingService.deleteCoupon(couponId).pipe(
            tap({
              next: id => {
                handleEvent({ type: MarketingEventType.CouponDeleted, couponId: id });
                loadStats();
              },
              error: () => handleEvent({ type: MarketingEventType.CouponDeleteFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const toggleActive = rxMethod<string>(
      pipe(
        switchMap(couponId =>
          marketingService.toggleCouponActive(couponId).pipe(
            tap({
              next: detail => {
                handleEvent({ type: MarketingEventType.ToggleActiveSucceeded, detail });
                loadStats();
              },
              error: () => handleEvent({ type: MarketingEventType.ToggleActiveFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const issueVouchers = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: MarketingEventType.IssueVoucherSubmitClicked })),
        switchMap(() => {
          const form = store.issueFormValue();
          if (!form || !form.couponId) {
            handleEvent({ type: MarketingEventType.IssueVoucherFailed, error: 'Thông tin phát hành không hợp lệ.' });
            return EMPTY;
          }

          return marketingService.issueVouchers({ 
            couponId: form.couponId, 
            customerId: form.customerId, 
            customerIds: form.customerIds 
          }).pipe(
            tap({
              next: () => {
                handleEvent({ type: MarketingEventType.IssueVoucherSucceeded });
                loadVouchers();
                loadStats();
              },
              error: (err: unknown) => {
                const errorMsg = getErrorMessage(err, 'Không thể phát hành voucher.');
                handleEvent({ type: MarketingEventType.IssueVoucherFailed, error: errorMsg });
              },
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    const revokeVoucher = rxMethod<string>(
      pipe(
        switchMap(customerVoucherId =>
          marketingService.deleteCustomerVoucher(customerVoucherId).pipe(
            tap({
              next: id => {
                handleEvent({ type: MarketingEventType.VoucherRevoked, customerVoucherId: id });
                loadStats();
              },
              error: (err: unknown) => {
                const errorMsg = getErrorMessage(err, 'Không thể thu hồi voucher.');
                handleEvent({ type: MarketingEventType.VoucherRevokeFailed, error: errorMsg });
              },
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    return {
      dispatch: handleEvent,
      loadAll(): void {
        loadCoupons();
        loadVouchers();
        loadStats();
        loadCustomers();
      },
      loadCoupons,
      loadVouchers,
      setTab(tabIndex: number): void {
        handleEvent({ type: MarketingEventType.TabChanged, tabIndex });
      },
      setKeyword(keyword: string): void {
        handleEvent({ type: MarketingEventType.SearchKeywordChanged, keyword });
      },
      setTypeFilter(couponType: ManagementCouponQuery['type']): void {
        handleEvent({ type: MarketingEventType.TypeFilterChanged, couponType });
      },
      setActiveFilter(activeStatus: ManagementCouponQuery['active']): void {
        handleEvent({ type: MarketingEventType.ActiveFilterChanged, activeStatus });
      },
      setSort(sort: ManagementCouponQuery['sort']): void {
        handleEvent({ type: MarketingEventType.SortChanged, sort });
      },
      applyFilters(): void {
        handleEvent({ type: MarketingEventType.FiltersApplied });
        loadCoupons();
      },
      resetFilters(): void {
        handleEvent({ type: MarketingEventType.FiltersReset, query: DEFAULT_COUPONS_QUERY });
        loadCoupons();
      },
      goToPage(page: number): void {
        handleEvent({ type: MarketingEventType.PageChanged, page });
        loadCoupons();
      },

      setVoucherKeyword(keyword: string): void {
        handleEvent({ type: MarketingEventType.VoucherKeywordChanged, keyword });
      },
      setVoucherCouponCode(couponCode: string): void {
        handleEvent({ type: MarketingEventType.VoucherCouponCodeChanged, couponCode });
      },
      setVoucherStatus(status: CustomerVoucherQuery['status']): void {
        handleEvent({ type: MarketingEventType.VoucherStatusChanged, status });
      },
      applyVoucherFilters(): void {
        handleEvent({ type: MarketingEventType.VoucherFiltersApplied });
        loadVouchers();
      },
      resetVoucherFilters(): void {
        handleEvent({ type: MarketingEventType.VoucherFiltersReset, query: DEFAULT_VOUCHERS_QUERY });
        loadVouchers();
      },
      goToVoucherPage(page: number): void {
        handleEvent({ type: MarketingEventType.VoucherPageChanged, page });
        loadVouchers();
      },

      openCreateDialog(): void {
        handleEvent({ type: MarketingEventType.CreateClicked });
      },
      openEditDialog(couponId: string): void {
        handleEvent({ type: MarketingEventType.EditClicked, couponId });
        loadDetail(couponId);
      },
      closeDialog(): void {
        handleEvent({ type: MarketingEventType.DialogClosed });
      },
      updateFormValue(patch: Partial<CouponFormValue>): void {
        handleEvent({ type: MarketingEventType.FormValueChanged, patch });
      },
      submitForm(): void {
        saveCoupon();
      },
      deleteCoupon(couponId: string): void {
        deleteCoupon(couponId);
      },
      toggleActive(couponId: string): void {
        toggleActive(couponId);
      },

      openIssueDialog(couponId?: string): void {
        handleEvent({ type: MarketingEventType.IssueVoucherClicked, couponId });
      },
      closeIssueDialog(): void {
        handleEvent({ type: MarketingEventType.IssueVoucherDialogClosed });
      },
      updateIssueFormValue(patch: { couponId?: string; customerId?: string | null; customerIds?: string[] }): void {
        handleEvent({ type: MarketingEventType.IssueFormValueChanged, patch });
      },
      submitIssueForm(): void {
        issueVouchers();
      },
      revokeVoucher(customerVoucherId: string): void {
        revokeVoucher(customerVoucherId);
      },
      clearMessages(): void {
        handleEvent({ type: MarketingEventType.MessagesCleared });
      },
    };
  })
);

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    return err.error?.message || err.message || fallback;
  }
  return (err as Error)?.message || fallback;
}
