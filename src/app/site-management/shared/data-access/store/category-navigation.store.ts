import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, Observable, catchError, finalize, map, of, pipe, shareReplay, switchMap, tap, throwError } from 'rxjs';
import {
  PRODUCT_CATEGORY_NOT_FOUND,
  ProductCatalogService,
} from '../../../product-catalog/data-access/services/product-catalog.service';
import { ProductCategory } from '../../../product-catalog/data-access/models/product-catalog.models';
import { HeaderNavItem, buildCategoryLink } from '../../site-navigation.models';

interface CategoryNavigationState {
  categories: ProductCategory[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

const INITIAL_STATE: CategoryNavigationState = {
  categories: [],
  loading: false,
  loaded: false,
  error: null,
};

export const CategoryNavigationStore = signalStore(
  { providedIn: 'root' },
  withState<CategoryNavigationState>(INITIAL_STATE),
  withComputed(({ categories }) => ({
    navItems: computed(() => categories().map(toHeaderNavItem)),
    flattenedCategories: computed(() => flattenCategories(categories())),
  })),
  withMethods((store, productCatalogService = inject(ProductCatalogService)) => {
    let categoryTreeRequest$: Observable<ProductCategory[]> | null = null;

    const requestCategoryTree = (): Observable<ProductCategory[]> => {
      if (store.loaded()) {
        return of(store.categories());
      }

      if (!categoryTreeRequest$) {
        patchState(store, { loading: true, error: null });

        categoryTreeRequest$ = productCatalogService.getCategoryTree().pipe(
          tap(categories =>
            patchState(store, {
              categories,
              loading: false,
              loaded: true,
              error: null,
            })
          ),
          catchError(error => {
            patchState(store, {
              categories: [],
              loading: false,
              loaded: false,
              error: 'Không thể tải danh mục lúc này.',
            });

            return throwError(() => error);
          }),
          finalize(() => {
            categoryTreeRequest$ = null;
          }),
          shareReplay({ bufferSize: 1, refCount: false })
        );
      }

      return categoryTreeRequest$;
    };

    return {
      loadCategoriesOnce: rxMethod<void>(
        pipe(
          switchMap(() =>
            store.loaded() ? EMPTY : requestCategoryTree().pipe(catchError(() => EMPTY))
          )
        )
      ),
      findCategoryBySlug(slug: string): ProductCategory | null {
        return findCategoryBySlug(store.categories(), slug);
      },
      resolveCategoryBySlug(slug: string): Observable<ProductCategory> {
        return requestCategoryTree().pipe(
          map(categories => findCategoryBySlug(categories, slug)),
          switchMap(category =>
            category
              ? of(category)
              : throwError(() => new Error(PRODUCT_CATEGORY_NOT_FOUND))
          )
        );
      },
    };
  })
);

function toHeaderNavItem(category: ProductCategory): HeaderNavItem {
  return {
    id: category.id,
    label: category.label,
    slug: category.slug,
    link: buildCategoryLink(category.slug),
    children: category.children?.map(toHeaderNavItem) ?? [],
  };
}

function flattenCategories(categories: ProductCategory[]): ProductCategory[] {
  return categories.flatMap(category => [
    {
      ...category,
      children: category.children ? [...category.children] : [],
    },
    ...flattenCategories(category.children ?? []),
  ]);
}

function findCategoryBySlug(categories: ProductCategory[], slug: string): ProductCategory | null {
  const normalizedSlug = normalizeCategorySlug(slug);

  for (const category of categories) {
    if (category.slug === normalizedSlug) {
      return category;
    }

    const matchedChild = findCategoryBySlug(category.children ?? [], normalizedSlug);

    if (matchedChild) {
      return matchedChild;
    }
  }

  return null;
}

function normalizeCategorySlug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}
