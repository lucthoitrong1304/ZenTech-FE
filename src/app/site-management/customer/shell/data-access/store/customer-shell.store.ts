import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, debounceTime, distinctUntilChanged, pipe, switchMap, tap } from 'rxjs';
import { ProductListItem } from '@/site-management/customer/catalog/data-access/models/product-catalog.models';
import { ProductCatalogService } from '@/site-management/customer/catalog/data-access/services/product-catalog.service';

interface CustomerShellState {
  instantResults: ProductListItem[];
  loadingResults: boolean;
}

const INITIAL_STATE: CustomerShellState = {
  instantResults: [],
  loadingResults: false,
};

export const CustomerShellStore = signalStore(
  withState(INITIAL_STATE),
  withMethods((store, productCatalogService = inject(ProductCatalogService)) => ({
    searchProducts: rxMethod<string>(
      pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          const search = query.trim();
          if (!search) {
            patchState(store, INITIAL_STATE);
            return EMPTY;
          }

          patchState(store, { loadingResults: true });
          return productCatalogService.getProducts({ search, size: 5 }).pipe(
            tap((response) =>
              patchState(store, {
                instantResults: response.items,
                loadingResults: false,
              }),
            ),
            catchError(() => {
              patchState(store, { instantResults: [], loadingResults: false });
              return EMPTY;
            }),
          );
        }),
      ),
    ),
    clearSearch(): void {
      patchState(store, INITIAL_STATE);
    },
  })),
);
