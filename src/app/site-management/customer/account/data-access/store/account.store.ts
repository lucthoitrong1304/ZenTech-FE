import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  addEntity,
  removeEntity,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, concatMap, EMPTY, exhaustMap, from, map, pipe, switchMap, tap, toArray } from 'rxjs';
import {
  AccountProfile,
  UpdateMyProfileRequest,
  CustomerAddressResponse,
  CustomerAddressRequest,
  CustomerOrderHistoryResponse,
  CustomerOrderDetailResponse,
  CustomerVoucherResponse,
  OrderFilter,
  VoucherStatus,
  ReturnEvidenceViewModel,
  SubmitReturnRequest,
} from '@/site-management/customer/account/data-access/models/account.models';
import { AccountService } from '@/site-management/customer/account/data-access/services/account.service';
import { AuthSessionStore } from '@/site-management/identity/data-access/store/auth-session.store';

interface AccountUiState {
  profile: AccountProfile | null;
  activeVoucherStatus: VoucherStatus;
  orderFilter: OrderFilter;
  orderSearchKeyword: string;
  actionMessage: string | null;
  loading: boolean;
  error: string | null;
  selectedOrderDetail: CustomerOrderDetailResponse | null;
  returnEvidence: ReturnEvidenceViewModel[];
  returnUploading: boolean;
  returnSubmitting: boolean;
  returnUploadError: string | null;
  returnSuccessMessage: string | null;
  returnFailureMessage: string | null;
}

const VOUCHER_ENTITY_CONFIG = {
  collection: 'voucher',
  selectId: (voucher: CustomerVoucherResponse) => voucher.voucherId,
} as const;

const ADDRESS_ENTITY_CONFIG = {
  collection: 'address',
  selectId: (address: CustomerAddressResponse) => address.addressId,
} as const;

const ORDER_ENTITY_CONFIG = {
  collection: 'order',
  selectId: (order: CustomerOrderHistoryResponse) => order.orderId,
} as const;

const INITIAL_STATE: AccountUiState = {
  profile: null,
  activeVoucherStatus: 'active',
  orderFilter: 'all',
  orderSearchKeyword: '',
  actionMessage: null,
  loading: false,
  error: null,
  selectedOrderDetail: null,
  returnEvidence: [],
  returnUploading: false,
  returnSubmitting: false,
  returnUploadError: null,
  returnSuccessMessage: null,
  returnFailureMessage: null,
};

export const AccountStore = signalStore(
  withState<AccountUiState>(INITIAL_STATE),
  withEntities<CustomerVoucherResponse, 'voucher'>({
    entity: {} as CustomerVoucherResponse,
    collection: 'voucher',
  }),
  withEntities<CustomerAddressResponse, 'address'>({
    entity: {} as CustomerAddressResponse,
    collection: 'address',
  }),
  withEntities<CustomerOrderHistoryResponse, 'order'>({
    entity: {} as CustomerOrderHistoryResponse,
    collection: 'order',
  }),
  withComputed(
    ({
      profile,
      activeVoucherStatus,
      orderFilter,
      orderSearchKeyword,
      voucherEntities,
      addressEntities,
      orderEntities,
      selectedOrderDetail,
      loading,
      error,
      actionMessage,
      returnEvidence,
      returnUploading,
      returnSubmitting,
      returnUploadError,
      returnSuccessMessage,
      returnFailureMessage,
    }) => ({
      vouchers: computed(() => voucherEntities()),
      addresses: computed(() => addressEntities()),
      orders: computed(() => orderEntities()),
      activeVoucherCount: computed(
        () => voucherEntities().filter(voucher => voucher.status === 'AVAILABLE').length
      ),
      filteredVouchers: computed(() => {
        const statusVal = activeVoucherStatus();
        const beStatus = statusVal === 'active' ? 'AVAILABLE' : statusVal.toUpperCase();

        return voucherEntities()
          .filter(voucher => voucher.status === beStatus)
          .map(voucher => {
            let value = '';
            let unit = '';
            let tone: 'primary' | 'secondary' | 'tertiary' | 'muted' = 'primary';

            if (voucher.couponType === 'PERCENTAGE') {
              value = `${voucher.discountValue}%`;
              unit = 'GIẢM';
              tone = 'primary';
            } else if (voucher.couponType === 'FIXED_AMOUNT') {
              value = `${voucher.discountValue / 1000}K`;
              unit = 'GIẢM';
              tone = 'secondary';
            } else {
              value = 'Miễn phí';
              unit = 'VẬN CHUYỂN';
              tone = 'tertiary';
            }

            if (voucher.status !== 'AVAILABLE') {
              tone = 'muted';
            }

            const title = `Mã giảm giá ${voucher.couponCode}`;
            const description =
              voucher.couponType === 'FREE_SHIPPING'
                ? `Miễn phí vận chuyển cho đơn hàng từ ${formatCurrency(voucher.minOrderAmount)}.`
                : `Giảm ${voucher.couponType === 'PERCENTAGE' ? voucher.discountValue + '%' : formatCurrency(voucher.discountValue)} cho đơn từ ${formatCurrency(voucher.minOrderAmount)} (Tối đa ${formatCurrency(voucher.maxDiscount)}).`;

            const badge =
              voucher.status === 'AVAILABLE'
                ? 'Khả dụng'
                : voucher.status === 'USED'
                  ? 'Đã sử dụng'
                  : 'Hết hạn';
            const actionLabel =
              voucher.status === 'AVAILABLE'
                ? 'Sao chép'
                : voucher.status === 'USED'
                  ? 'Đã sử dụng'
                  : 'Đã hết hạn';

            return {
              id: voucher.voucherId,
              title,
              description,
              value,
              unit,
              badge,
              code: voucher.couponCode,
              expiresOn: voucher.endAt,
              status: statusVal,
              actionLabel,
              tone,
            };
          });
      }),
      defaultAddress: computed(
        () => addressEntities().find(address => address.isDefault) ?? addressEntities()[0] ?? null
      ),
      filteredOrders: computed(() => {
        const keyword = orderSearchKeyword().trim().toLowerCase();
        const filteredByDate = filterOrdersByWindow(orderEntities(), orderFilter());

        if (!keyword) {
          return filteredByDate;
        }

        return filteredByDate.filter(
          order =>
            order.orderId.toLowerCase().includes(keyword) ||
            order.items.some(item => item.productName.toLowerCase().includes(keyword))
        );
      }),
      overviewRecentOrders: computed(() => orderEntities().slice(0, 2)),
      vm: computed(() => ({
        profile: profile(),
        activeVoucherStatus: activeVoucherStatus(),
        orderFilter: orderFilter(),
        orderSearchKeyword: orderSearchKeyword(),
        vouchers: voucherEntities(),
        addresses: addressEntities(),
        orders: orderEntities(),
        selectedOrderDetail: selectedOrderDetail(),
        loading: loading(),
        error: error(),
        actionMessage: actionMessage(),
        returnEvidence: returnEvidence(),
        returnUploading: returnUploading(),
        returnSubmitting: returnSubmitting(),
        returnUploadError: returnUploadError(),
        returnSuccessMessage: returnSuccessMessage(),
        returnFailureMessage: returnFailureMessage(),
      })),
    })
  ),
  withMethods(
    (
      store,
      accountService = inject(AccountService),
      authSessionStore = inject(AuthSessionStore)
    ) => {
      const loadProfile = rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(() =>
            accountService.getProfile().pipe(
              tap({
                next: res => {
                  if (res.success) {
                    patchState(store, { profile: res.data, loading: false });
                    if (res.data) {
                      authSessionStore.updateCurrentUserProfile(res.data.fullName, res.data.imageUrl);
                    }
                  } else {
                    patchState(store, { error: res.message || 'Failed to load profile', loading: false });
                  }
                },
                error: err => {
                  patchState(store, { error: err.message || 'Failed to load profile', loading: false });
                },
              }),
              catchError(() => EMPTY)
            )
          )
        )
      );

      const updateProfile = rxMethod<UpdateMyProfileRequest>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(payload =>
            accountService.updateProfile(payload).pipe(
              tap({
                next: res => {
                  if (res.success) {
                    patchState(store, {
                      profile: res.data,
                      loading: false,
                      actionMessage: 'Cập nhật thông tin thành công!',
                    });
                    if (res.data) {
                      authSessionStore.updateCurrentUserProfile(res.data.fullName, res.data.imageUrl);
                    }
                  } else {
                    patchState(store, { error: res.message || 'Failed to update profile', loading: false });
                  }
                },
                error: err => {
                  patchState(store, { error: err.message || 'Failed to update profile', loading: false });
                },
              }),
              catchError(() => EMPTY)
            )
          )
        )
      );

      const uploadAvatar = rxMethod<{ file: File }>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(({ file }) =>
            accountService.requestAvatarUploadPresign(file.name, file.type, file.size).pipe(
              switchMap(presign =>
                accountService.uploadToR2(presign, file).pipe(
                  switchMap(() => {
                    const fullName = store.profile()?.fullName || '';
                    return accountService.updateProfile({ fullName, imageUrl: presign.fileKey });
                  })
                )
              ),
              tap({
                next: res => {
                  if (res.success) {
                    patchState(store, {
                      profile: res.data,
                      loading: false,
                      actionMessage: 'Cập nhật ảnh đại diện thành công!',
                    });
                    if (res.data) {
                      authSessionStore.updateCurrentUserProfile(res.data.fullName, res.data.imageUrl);
                    }
                  } else {
                    patchState(store, {
                      error: res.message || 'Failed to update profile picture',
                      loading: false,
                    });
                  }
                },
                error: err => {
                  patchState(store, {
                    error: err.message || 'Failed to upload and update avatar',
                    loading: false,
                  });
                },
              }),
              catchError(() => EMPTY)
            )
          )
        )
      );

    const loadAddresses = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() =>
          accountService.getAddresses().pipe(
            tap({
              next: res => {
                if (res.success) {
                  patchState(store, setAllEntities(res.data, ADDRESS_ENTITY_CONFIG), {
                    loading: false,
                  });
                } else {
                  patchState(store, {
                    error: res.message || 'Failed to load addresses',
                    loading: false,
                  });
                }
              },
              error: err => {
                patchState(store, { error: err.message || 'Failed to load addresses', loading: false });
              },
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const createAddress = rxMethod<CustomerAddressRequest>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(payload =>
          accountService.createAddress(payload).pipe(
            tap({
              next: res => {
                if (res.success) {
                  patchState(store, addEntity(res.data, ADDRESS_ENTITY_CONFIG), {
                    loading: false,
                    actionMessage: 'Thêm địa chỉ giao hàng thành công!',
                  });
                  if (payload.isDefault) {
                    loadAddresses();
                  }
                } else {
                  patchState(store, { error: res.message || 'Failed to create address', loading: false });
                }
              },
              error: err => {
                patchState(store, { error: err.message || 'Failed to create address', loading: false });
              },
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const updateAddress = rxMethod<{ addressId: string; payload: CustomerAddressRequest }>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(({ addressId, payload }) =>
          accountService.updateAddress(addressId, payload).pipe(
            tap({
              next: res => {
                if (res.success) {
                  patchState(
                    store,
                    updateEntity({ id: addressId, changes: res.data }, ADDRESS_ENTITY_CONFIG),
                    {
                      loading: false,
                      actionMessage: 'Cập nhật địa chỉ thành công!',
                    }
                  );
                  loadAddresses();
                } else {
                  patchState(store, { error: res.message || 'Failed to update address', loading: false });
                }
              },
              error: err => {
                patchState(store, { error: err.message || 'Failed to update address', loading: false });
              },
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const setDefaultAddress = rxMethod<string>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(addressId =>
          accountService.setDefaultAddress(addressId).pipe(
            tap({
              next: res => {
                if (res.success) {
                  patchState(store, {
                    loading: false,
                    actionMessage: 'Đã đặt làm địa chỉ mặc định!',
                  });
                  loadAddresses();
                } else {
                  patchState(store, {
                    error: res.message || 'Failed to set default address',
                    loading: false,
                  });
                }
              },
              error: err => {
                patchState(store, {
                  error: err.message || 'Failed to set default address',
                  loading: false,
                });
              },
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const deleteAddress = rxMethod<string>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(addressId =>
          accountService.deleteAddress(addressId).pipe(
            tap({
              next: res => {
                if (res.success) {
                  patchState(store, removeEntity(addressId, ADDRESS_ENTITY_CONFIG), {
                    loading: false,
                    actionMessage: 'Đã xóa địa chỉ!',
                  });
                  loadAddresses();
                } else {
                  patchState(store, { error: res.message || 'Failed to delete address', loading: false });
                }
              },
              error: err => {
                patchState(store, { error: err.message || 'Failed to delete address', loading: false });
              },
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const loadOrders = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() =>
          accountService.getOrders(0, 100, 'createdAt,desc').pipe(
            tap({
              next: res => {
                if (res.success) {
                  patchState(store, setAllEntities(res.data.content, ORDER_ENTITY_CONFIG), {
                    loading: false,
                  });
                } else {
                  patchState(store, { error: res.message || 'Failed to load orders', loading: false });
                }
              },
              error: err => {
                patchState(store, { error: err.message || 'Failed to load orders', loading: false });
              },
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const loadOrderDetail = rxMethod<string>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null, selectedOrderDetail: null })),
        switchMap(orderId =>
          accountService.getOrderDetail(orderId).pipe(
            tap({
              next: res => {
                if (res.success) {
                  patchState(store, { selectedOrderDetail: res.data, loading: false });
                } else {
                  patchState(store, {
                    error: res.message || 'Failed to load order details',
                    loading: false,
                  });
                }
              },
              error: err => {
                patchState(store, {
                  error: err.message || 'Failed to load order details',
                  loading: false,
                });
              },
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const cancelOrder = rxMethod<string>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(orderId =>
          accountService.cancelOrder(orderId).pipe(
            tap({
              next: res => {
                if (res.success) {
                  patchState(store, {
                    loading: false,
                    actionMessage: 'Đơn hàng đã được hủy thành công!',
                    selectedOrderDetail: res.data,
                  });
                  loadOrders();
                } else {
                  patchState(store, {
                    error: res.message || 'Hủy đơn hàng thất bại',
                    loading: false,
                  });
                }
              },
              error: err => {
                patchState(store, {
                  error: err.message || 'Đã xảy ra lỗi khi hủy đơn hàng',
                  loading: false,
                });
              },
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const loadVouchers = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() =>
          accountService.getVouchers(0, 100, 'issuedAt,desc').pipe(
            tap({
              next: res => {
                if (res.success) {
                  patchState(store, setAllEntities(res.data.content, VOUCHER_ENTITY_CONFIG), {
                    loading: false,
                  });
                } else {
                  patchState(store, { error: res.message || 'Failed to load vouchers', loading: false });
                }
              },
              error: err => {
                patchState(store, { error: err.message || 'Failed to load vouchers', loading: false });
              },
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const uploadReturnEvidence = rxMethod<readonly File[]>(
      pipe(
        tap(() => patchState(store, { returnUploading: true, returnUploadError: null })),
        concatMap(files =>
          from(files).pipe(
            concatMap(file => {
              const isVideo = file.type.startsWith('video/');
              const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;

              if (file.size > maxSize) {
                patchState(store, {
                  returnUploadError: `Tệp ${file.name} vượt quá dung lượng cho phép (${isVideo ? '50MB' : '5MB'}).`,
                });
                return EMPTY;
              }

              return accountService.requestReturnEvidenceUploadPresign(file.name, file.type, file.size).pipe(
                concatMap(presign =>
                  accountService.uploadToR2(presign, file).pipe(
                    map((): ReturnEvidenceViewModel => ({
                      id: crypto.randomUUID(),
                      fileKey: presign.fileKey,
                      fileName: file.name,
                      contentType: file.type,
                      previewUrl: URL.createObjectURL(file),
                    }))
                  )
                ),
                catchError(error => {
                  patchState(store, {
                    returnUploadError: `Không thể tải lên tệp ${file.name}: ${errorMessage(error)}`,
                  });
                  return EMPTY;
                })
              );
            }),
            toArray(),
            tap(evidence =>
              patchState(store, current => ({
                returnEvidence: [...current.returnEvidence, ...evidence],
                returnUploading: false,
              }))
            ),
            catchError(error => {
              patchState(store, {
                returnUploading: false,
                returnUploadError: `Không thể tải bằng chứng: ${errorMessage(error)}`,
              });
              return EMPTY;
            })
          )
        )
      )
    );

    const submitReturnRequest = rxMethod<SubmitReturnRequest>(
      pipe(
        tap(() => patchState(store, {
          returnSubmitting: true,
          returnSuccessMessage: null,
          returnFailureMessage: null,
          error: null,
        })),
        exhaustMap(({ orderId, reason, details }) =>
          accountService
            .submitReturnRequest(orderId, {
              reason,
              details,
              proofFileKeys: store.returnEvidence().map(evidence => evidence.fileKey).join(','),
            })
            .pipe(
              tap({
                next: response => {
                  if (response.success) {
                    releaseReturnEvidence(store.returnEvidence());
                    patchState(store, {
                      returnEvidence: [],
                      returnSubmitting: false,
                      returnSuccessMessage: 'Gửi yêu cầu trả hàng thành công',
                      actionMessage: 'Gửi yêu cầu trả hàng thành công',
                    });
                    loadOrders();
                    return;
                  }

                  patchState(store, {
                    returnSubmitting: false,
                    error: response.message || 'Gửi yêu cầu trả hàng thất bại',
                    returnFailureMessage: response.message || 'Gửi yêu cầu trả hàng thất bại',
                  });
                },
                error: error =>
                  patchState(store, {
                    returnSubmitting: false,
                  error: `Đã xảy ra lỗi khi gửi yêu cầu: ${errorMessage(error)}`,
                  returnFailureMessage: `Đã xảy ra lỗi khi gửi yêu cầu: ${errorMessage(error)}`,
                  }),
              }),
              catchError(() => EMPTY)
            )
        )
      )
    );

    return {
      loadProfile,
      updateProfile,
      uploadAvatar,
      loadAddresses,
      createAddress,
      updateAddress,
      setDefaultAddress,
      deleteAddress,
      loadOrders,
      loadOrderDetail,
      cancelOrder,
      loadVouchers,
      uploadReturnEvidence,
      submitReturnRequest,
      clearReturnEvidence(): void {
        releaseReturnEvidence(store.returnEvidence());
        patchState(store, {
          returnEvidence: [],
          returnUploadError: null,
          returnSuccessMessage: null,
          returnFailureMessage: null,
        });
      },
      removeReturnEvidence(id: string): void {
        const evidence = store.returnEvidence().find(item => item.id === id);
        if (evidence) {
          URL.revokeObjectURL(evidence.previewUrl);
        }
        patchState(store, current => ({
          returnEvidence: current.returnEvidence.filter(item => item.id !== id),
        }));
      },
      clearReturnSuccessMessage(): void {
        patchState(store, { returnSuccessMessage: null });
      },
      clearReturnFailureMessage(): void {
        patchState(store, { returnFailureMessage: null });
      },
      clearActionMessage(): void {
        patchState(store, { actionMessage: null });
      },
      setOrderFilter(filter: OrderFilter): void {
        patchState(store, { orderFilter: filter });
      },
      setOrderSearchKeyword(keyword: string): void {
        patchState(store, { orderSearchKeyword: keyword });
      },
      setVoucherTab(status: VoucherStatus): void {
        patchState(store, { activeVoucherStatus: status });
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadProfile();
      store.loadAddresses();
      store.loadOrders();
      store.loadVouchers();
    },
  })
);

function filterOrdersByWindow(
  orders: CustomerOrderHistoryResponse[],
  filter: OrderFilter
): CustomerOrderHistoryResponse[] {
  if (filter === 'all') {
    return orders;
  }

  if (filter === 'year2026') {
    return orders.filter(order => new Date(order.createdAt).getFullYear() === 2026);
  }

  const cutoff = new Date('2026-05-24T00:00:00');
  cutoff.setDate(cutoff.getDate() - (filter === 'last30' ? 30 : 180));

  return orders.filter(order => new Date(order.createdAt) >= cutoff);
}

function formatCurrency(num: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(num)
    .replace(/\s/g, '');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Lỗi kết nối';
}

function releaseReturnEvidence(evidence: readonly ReturnEvidenceViewModel[]): void {
  evidence.forEach(item => URL.revokeObjectURL(item.previewUrl));
}

