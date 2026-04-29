import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { ProductCatalogService } from '../../../product-catalog/data-access/services/product-catalog.service';
import { CategoryNavigationStore } from './category-navigation.store';

describe('CategoryNavigationStore', () => {
  function configureStore(getCategoryTree = vi.fn(() => of(createCategoryTree()))) {
    TestBed.configureTestingModule({
      providers: [
        CategoryNavigationStore,
        {
          provide: ProductCatalogService,
          useValue: { getCategoryTree },
        },
      ],
    });

    return {
      store: TestBed.inject(CategoryNavigationStore),
      getCategoryTree,
    };
  }

  it('loads category tree once and maps parent child nav items', () => {
    const { store, getCategoryTree } = configureStore();

    store.loadCategoriesOnce();

    expect(getCategoryTree).toHaveBeenCalledTimes(1);
    expect(store.loaded()).toBe(true);
    expect(store.navItems()).toEqual([
      {
        id: 'root-1',
        label: 'Keyboards',
        slug: 'keyboards',
        link: '/categories/keyboards',
        children: [
          {
            id: 'child-1',
            label: 'HE Keyboard',
            slug: 'he-keyboard',
            link: '/categories/he-keyboard',
            children: [],
          },
        ],
      },
      {
        id: 'root-2',
        label: 'Bluetooth Speaker',
        slug: 'bluetooth-speaker',
        link: '/categories/bluetooth-speaker',
        children: [],
      },
    ]);
  });

  it('does not make a second request after categories are loaded', () => {
    const { store, getCategoryTree } = configureStore();

    store.loadCategoriesOnce();
    store.loadCategoriesOnce();

    expect(getCategoryTree).toHaveBeenCalledTimes(1);
  });

  it('resolves categories by parent and child slugs', async () => {
    const { store } = configureStore();

    const parent = await firstValueFrom(store.resolveCategoryBySlug('bluetooth-speaker'));
    const child = await firstValueFrom(store.resolveCategoryBySlug('he-keyboard'));

    expect(parent.id).toBe('root-2');
    expect(child.id).toBe('child-1');
    expect(store.findCategoryBySlug('keyboards')?.id).toBe('root-1');
  });
});

function createCategoryTree() {
  return [
    {
      id: 'root-1',
      slug: 'keyboards',
      label: 'Keyboards',
      children: [
        {
          id: 'child-1',
          slug: 'he-keyboard',
          label: 'HE Keyboard',
          children: [],
        },
      ],
    },
    {
      id: 'root-2',
      slug: 'bluetooth-speaker',
      label: 'Bluetooth Speaker',
      children: [],
    },
  ];
}
