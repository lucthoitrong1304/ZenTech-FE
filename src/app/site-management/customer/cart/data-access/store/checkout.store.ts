import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, concatMap, map, of, pipe, switchMap, tap } from 'rxjs';
import { generateTraceId } from '@/core/observability/tracing/trace-id.util';
import { CustomerVoucherResponse } from '@/site-management/customer/contracts/customer-checkout.models';
import { CustomerAddressResponse } from '@/site-management/customer/contracts/customer-order.models';
import { BusinessEventService, BusinessEventType } from '../services/business-event.service';
import { CheckoutService } from '../services/checkout.service';
import { CheckoutPaymentMethod, CheckoutResponse } from '../models/checkout.model';
import { CartStore } from './cart.store';

const DEFAULT_SHIPPING_FEE = 25_000;

interface CheckoutState {
  addresses: CustomerAddressResponse[];
  vouchers: CustomerVoucherResponse[];
  selectedAddressId: string | null;
  selectedVoucherId: string | null;
  voucherCode: string;
  paymentMethod: CheckoutPaymentMethod;
  addressLoading: boolean;
  voucherLoading: boolean;
  submitting: boolean;
  error: string | null;
  actionMessage: string | null;
  completion: CheckoutResponse | null;
}

const INITIAL_STATE: CheckoutState = {
  addresses: [],
  vouchers: [],
  selectedAddressId: null,
  selectedVoucherId: null,
  voucherCode: '',
  paymentMethod: 'CASH',
  addressLoading: false,
  voucherLoading: false,
  submitting: false,
  error: null,
  actionMessage: null,
  completion: null,
};

export const CheckoutStore = signalStore(
  withState(INITIAL_STATE),
  withComputed((store, cartStore = inject(CartStore)) => ({
    addressOptions: computed(() =>
      store.addresses().map((address) => ({
        ...address,
        displayText: [address.street, address.ward, address.province].filter(Boolean).join(', '),
      })),
    ),
    voucherOptions: computed(() =>
      store.vouchers().map((voucher) => {
        const eligible = voucher.status === 'AVAILABLE' && cartStore.subtotal() >= voucher.minOrderAmount;
        const label =
          voucher.couponType === 'PERCENTAGE'
            ? `Giảm ${voucher.discountValue}%`
            : voucher.couponType === 'FIXED_AMOUNT'
              ? `Giảm ${formatCurrency(voucher.discountValue)}`
              : 'Miễn phí vận chuyển';
        const minAmount = formatCurrency(voucher.minOrderAmount);
        const maxDiscount = voucher.maxDiscount > 0 ? `, tối đa ${formatCurrency(voucher.maxDiscount)}` : '';

        return {
          ...voucher,
          eligible,
          label,
          description: `${eligible ? 'Có thể áp dụng' : `Cần đơn từ ${minAmount}`}${voucher.couponType === 'PERCENTAGE' ? maxDiscount : ''}`,
        };
      }),
    ),
    selectedVoucher: computed(() =>
      store.vouchers().find((voucher) => voucher.voucherId === store.selectedVoucherId()) ?? null,
    ),
    shippingFee: computed(() => (cartStore.isEmpty() ? 0 : DEFAULT_SHIPPING_FEE)),
    discount: computed(() => {
      const voucher = store.vouchers().find((item) => item.voucherId === store.selectedVoucherId());
      if (!voucher || voucher.status !== 'AVAILABLE' || cartStore.subtotal() < voucher.minOrderAmount) {
        return 0;
      }

      if (voucher.couponType === 'PERCENTAGE') {
        const discount = (cartStore.subtotal() * voucher.discountValue) / 100;
        return voucher.maxDiscount > 0 ? Math.min(discount, voucher.maxDiscount) : discount;
      }
      if (voucher.couponType === 'FIXED_AMOUNT') {
        return Math.min(voucher.discountValue, cartStore.subtotal());
      }
      return cartStore.isEmpty() ? 0 : DEFAULT_SHIPPING_FEE;
    }),
    total: computed(() => {
      const voucher = store.vouchers().find((item) => item.voucherId === store.selectedVoucherId());
      const shippingFee = cartStore.isEmpty() ? 0 : DEFAULT_SHIPPING_FEE;
      const eligible = voucher && voucher.status === 'AVAILABLE' && cartStore.subtotal() >= voucher.minOrderAmount;
      const discount = !eligible
        ? 0
        : voucher.couponType === 'PERCENTAGE'
          ? voucher.maxDiscount > 0
            ? Math.min((cartStore.subtotal() * voucher.discountValue) / 100, voucher.maxDiscount)
            : (cartStore.subtotal() * voucher.discountValue) / 100
          : voucher.couponType === 'FIXED_AMOUNT'
            ? Math.min(voucher.discountValue, cartStore.subtotal())
            : shippingFee;

      return Math.max(0, cartStore.subtotal() + shippingFee - discount);
    }),
    canSubmit: computed(() =>
      !cartStore.isEmpty() && !!store.selectedAddressId() && !store.submitting(),
    ),
  })),
  withMethods(
    (
      store,
      cartStore = inject(CartStore),
      checkoutService = inject(CheckoutService),
      businessEventService = inject(BusinessEventService),
    ) => {
      const loadAddresses = rxMethod<void>(
        pipe(
          switchMap(() => {
            if (store.addressLoading() || store.addresses().length > 0) {
              return EMPTY;
            }
            patchState(store, { addressLoading: true, error: null });
            return checkoutService.getAddresses().pipe(
              tap((response) => {
                const addresses = response.data ?? [];
                patchState(store, {
                  addresses,
                  selectedAddressId: addresses.find((address) => address.isDefault)?.addressId ?? addresses[0]?.addressId ?? null,
                  addressLoading: false,
                });
              }),
              catchError(() => {
                patchState(store, { addressLoading: false, error: 'Không thể tải địa chỉ giao hàng. Vui lòng thử lại.' });
                return EMPTY;
              }),
            );
          }),
        ),
      );

      const loadVouchers = rxMethod<void>(
        pipe(
          switchMap(() => {
            if (store.voucherLoading() || store.vouchers().length > 0) {
              return EMPTY;
            }
            patchState(store, { voucherLoading: true, error: null });
            return checkoutService.getAvailableVouchers().pipe(
              tap((response) => patchState(store, { vouchers: response.data?.content ?? [], voucherLoading: false })),
              catchError(() => {
                patchState(store, {
                  voucherLoading: false,
                  error: 'Không thể tải mã giảm giá. Bạn vẫn có thể thanh toán không dùng voucher.',
                });
                return EMPTY;
              }),
            );
          }),
        ),
      );

      const submit = rxMethod<void>(
        pipe(
          switchMap(() => {
            const addressId = store.selectedAddressId();
            if (cartStore.isEmpty()) {
              patchState(store, { error: 'Giỏ hàng đang trống.' });
              return EMPTY;
            }
            if (!addressId) {
              patchState(store, { error: 'Vui lòng chọn địa chỉ giao hàng trước khi thanh toán.' });
              return EMPTY;
            }

            const amount = store.total();
            const traceId = generateTraceId();
            patchState(store, { submitting: true, error: null, completion: null });

            return businessEventService.record({ eventType: BusinessEventType.CHECKOUT_START, amount, traceId }).pipe(
              catchError(() => of(null)),
              concatMap(() =>
                checkoutService.checkout({
                  addressId,
                  paymentMethod: store.paymentMethod(),
                  customerVoucherId: store.selectedVoucherId() ?? undefined,
                  items: cartStore.items().map((item) => ({ productVariantId: item.variantId, quantity: item.quantity })),
                }, traceId),
              ),
              concatMap((response) => {
                const completion = response.data;
                cartStore.clearCart();
                const successEvent = completion.paymentUrl
                  ? of(null)
                  : businessEventService.record({ eventType: BusinessEventType.PAYMENT_SUCCESS, amount, traceId }).pipe(catchError(() => of(null)));

                return successEvent.pipe(map(() => completion));
              }),
              tap((completion) => patchState(store, { submitting: false, completion })),
              catchError((error: unknown) =>
                businessEventService.record({ eventType: BusinessEventType.PAYMENT_FAILED, amount, traceId }).pipe(
                  catchError(() => of(null)),
                  tap(() => patchState(store, { submitting: false, error: extractErrorMessage(error) })),
                  switchMap(() => EMPTY),
                ),
              ),
            );
          }),
        ),
      );

      return {
        loadAddresses,
        loadVouchers,
        submit,
        setAddress(addressId: string): void {
          patchState(store, { selectedAddressId: addressId, error: null });
        },
        setPaymentMethod(paymentMethod: CheckoutPaymentMethod): void {
          patchState(store, { paymentMethod, error: null });
        },
        setVoucherCode(voucherCode: string): void {
          patchState(store, { voucherCode, error: null, selectedVoucherId: voucherCode.trim() ? store.selectedVoucherId() : null });
        },
        selectVoucher(voucherId: string | null): void {
          const voucher = store.vouchers().find((item) => item.voucherId === voucherId);
          patchState(store, { selectedVoucherId: voucher?.voucherId ?? null, voucherCode: voucher?.couponCode ?? '', error: null });
        },
        applyVoucherCode(): void {
          const code = store.voucherCode().trim().toUpperCase();
          if (!code) {
            patchState(store, { selectedVoucherId: null, actionMessage: null });
            return;
          }
          const voucher = store.vouchers().find((item) => item.couponCode.toUpperCase() === code);
          if (!voucher) {
            patchState(store, { selectedVoucherId: null, error: 'Mã giảm giá không tồn tại trong ví voucher của bạn.' });
            return;
          }
          if (voucher.status !== 'AVAILABLE' || cartStore.subtotal() < voucher.minOrderAmount) {
            patchState(store, { selectedVoucherId: null, error: `Cần đơn từ ${formatCurrency(voucher.minOrderAmount)}` });
            return;
          }
          patchState(store, { selectedVoucherId: voucher.voucherId, voucherCode: voucher.couponCode, actionMessage: `Đã áp dụng mã ${voucher.couponCode}`, error: null });
        },
        consumeActionMessage(): void {
          patchState(store, { actionMessage: null });
        },
        consumeCompletion(): void {
          patchState(store, { completion: null });
        },
      };
    },
  ),
);

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value).replace(/\s/g, '');
}

function extractErrorMessage(error: unknown): string {
  const candidate = error as { error?: { message?: string; errors?: string[] } };
  return candidate.error?.errors?.join(', ') ?? candidate.error?.message ?? 'Không thể tạo đơn thanh toán. Vui lòng thử lại.';
}
