import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, expand, finalize, map, pipe, switchMap, tap, timer } from 'rxjs';
import { CustomerOrderDetailResponse } from '@/site-management/customer/contracts/customer-order.models';
import { CheckoutResultResponse, CheckoutResultService } from '@/site-management/customer/cart/data-access/services/checkout-result.service';

interface CheckoutResultState {
  order: CustomerOrderDetailResponse | null;
  loading: boolean;
  error: string | null;
}

interface CheckoutOrderPoll {
  response: CheckoutResultResponse;
  attempt: number;
}

const INITIAL_STATE: CheckoutResultState = {
  order: null,
  loading: false,
  error: null,
};

export const CheckoutResultStore = signalStore(
  withState(INITIAL_STATE),
  withMethods((store, checkoutResultService = inject(CheckoutResultService)) => ({
    load: rxMethod<{ orderId: string; pollForPaymentConfirmation: boolean }>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null, order: null })),
        switchMap(({ orderId, pollForPaymentConfirmation }) =>
          checkoutResultService.getOrderDetail(orderId).pipe(
            map(response => ({ response, attempt: 0 } satisfies CheckoutOrderPoll)),
            expand(({ response, attempt }) => {
              const shouldPoll =
                pollForPaymentConfirmation &&
                response.data?.paymentStatus !== 'SUCCESS' &&
                attempt < 3;

              return shouldPoll
                ? timer(1_500).pipe(
                    switchMap(() => checkoutResultService.getOrderDetail(orderId)),
                    map(nextResponse => ({ response: nextResponse, attempt: attempt + 1 }))
                  )
                : EMPTY;
            }),
            tap(({ response }) => {
              if (response.success) {
                patchState(store, { order: response.data });
              } else {
                patchState(store, { error: response.message || 'Failed to load order details' });
              }
            }),
            catchError(error => {
              patchState(store, {
                error: error instanceof Error ? error.message : 'Failed to load order details',
              });
              return EMPTY;
            }),
            finalize(() => patchState(store, { loading: false }))
          )
        )
      )
    ),
  }))
);
