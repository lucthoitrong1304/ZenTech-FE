import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CategoryNavigationStore } from '../../../../shared/data-access/store/category-navigation.store';
import { ManagementCategory, ManagementCategoryDraft } from '../models/management-category.models';
import { ManagementCategoryService } from '../services/management-category.service';
import { ManagementCategoriesStore } from './management-categories.store';

describe('ManagementCategoriesStore', () => {
  beforeAll(() => {
    try {
      getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch (error) {
      if (!(error instanceof Error) || !isTestEnvironmentAlreadyInitialized(error)) {
        throw error;
      }
    }
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function configureStore(
    categoryService: Partial<ManagementCategoryService>,
    refreshCategories = vi.fn()
  ): InstanceType<typeof ManagementCategoriesStore> {
    TestBed.configureTestingModule({
      providers: [
        ManagementCategoriesStore,
        {
          provide: ManagementCategoryService,
          useValue: categoryService,
        },
        {
          provide: CategoryNavigationStore,
          useValue: { refreshCategories },
        },
      ],
    });

    return TestBed.inject(ManagementCategoriesStore);
  }

  it('loads categories and filters by keyword plus visibility', () => {
    const getCategories = vi.fn(() => of(createCategories()));
    const store = configureStore({ getCategories });

    store.loadCategories();
    store.setKeyword('mechanical');
    store.setVisibilityFilter('hidden');

    expect(getCategories).toHaveBeenCalledTimes(1);
    expect(store.flatCategories().map(category => category.id)).toEqual([
      'root-keyboards',
      'he-keyboards',
      'mechanical-keyboards',
      'mice',
    ]);
    expect(store.filteredCategories()[0].children.map(category => category.id)).toEqual([
      'mechanical-keyboards',
    ]);
    expect(store.activeFilterCount()).toBe(2);
  });

  it('opens create and edit dialogs with valid parent options', () => {
    const store = configureStore({ getCategories: () => of(createCategories()) });

    store.loadCategories();
    store.openCreateDialog('root-keyboards');

    expect(store.dialogMode()).toBe('create');
    expect(store.draft()).toMatchObject({ parentId: 'root-keyboards', visible: true });

    store.openEditDialog(store.flatCategories()[0]);

    expect(store.dialogMode()).toBe('edit');
    expect(store.parentOptions().map(category => category.id)).toEqual(['mice']);
  });

  it('validates draft before save and creates a category', () => {
    const created = createCategory({ id: 'chargers', categoryName: 'Chargers' });
    const createCategoryRequest = vi.fn((draft: ManagementCategoryDraft) =>
      of({ ...created, categoryName: draft.categoryName })
    );
    const refreshCategories = vi.fn();
    const store = configureStore(
      {
        getCategories: () => of(createCategories()),
        createCategory: createCategoryRequest,
      },
      refreshCategories
    );

    store.loadCategories();
    store.openCreateDialog();
    store.saveDraft();

    expect(store.formErrors().categoryName).toBe('Vui lòng nhập tên danh mục.');

    store.updateDraft({ categoryName: 'Chargers', shortName: 'Chargers' });
    store.saveDraft();

    expect(createCategoryRequest).toHaveBeenCalledWith({
      categoryName: 'Chargers',
      shortName: 'Chargers',
      parentId: null,
      visible: true,
    });
    expect(store.dialogVisible()).toBe(false);
    expect(refreshCategories).toHaveBeenCalledTimes(1);
  });

  it('updates visibility without opening the edit dialog', () => {
    const updateCategory = vi.fn((draft: ManagementCategoryDraft) =>
      of(createCategory({ id: draft.id, categoryName: draft.categoryName, visible: draft.visible }))
    );
    const store = configureStore({
      getCategories: () => of(createCategories()),
      updateCategory,
    });

    store.loadCategories();
    store.toggleVisible(store.flatCategories()[1]);

    expect(updateCategory).toHaveBeenCalledWith({
      id: 'he-keyboards',
      categoryName: 'Hall Effect Keyboard',
      shortName: 'HE Keyboard',
      parentId: 'root-keyboards',
      visible: false,
    });
    expect(store.dialogMode()).toBeNull();
  });

  it('sends full reorder payload when moving within siblings', () => {
    const reorderCategories = vi.fn(() => of(createCategories()));
    const store = configureStore({
      getCategories: () => of(createCategories()),
      reorderCategories,
    });

    store.loadCategories();
    store.reorderCategory({ categoryId: 'mechanical-keyboards', direction: 'up' });

    expect(reorderCategories).toHaveBeenCalledWith([
      { id: 'root-keyboards', parentId: null, priority: 1 },
      { id: 'mechanical-keyboards', parentId: 'root-keyboards', priority: 1 },
      { id: 'he-keyboards', parentId: 'root-keyboards', priority: 2 },
      { id: 'mice', parentId: null, priority: 2 },
    ]);
  });

  it('stores load failures', () => {
    const store = configureStore({
      getCategories: () => throwError(() => new Error('Network failed')),
    });

    store.loadCategories();

    expect(store.loading()).toBe(false);
    expect(store.errorMessage()).toBe('Network failed');
  });
});

function isTestEnvironmentAlreadyInitialized(error: Error): boolean {
  return (
    error.message.includes('already been initialized') ||
    error.message.includes('already been called')
  );
}

function createCategories(): ManagementCategory[] {
  const heKeyboard = createCategory({
    id: 'he-keyboards',
    categoryName: 'Hall Effect Keyboard',
    shortName: 'HE Keyboard',
    parentId: 'root-keyboards',
    depth: 1,
  });
  const mechanicalKeyboard = createCategory({
    id: 'mechanical-keyboards',
    categoryName: 'Mechanical Keyboards',
    shortName: 'Mechanical',
    visible: false,
    parentId: 'root-keyboards',
    depth: 1,
  });
  const rootKeyboard = createCategory({
    id: 'root-keyboards',
    categoryName: 'Keyboards',
    shortName: 'Keyboards',
    hasChildren: true,
    children: [heKeyboard, mechanicalKeyboard],
  });

  return [
    rootKeyboard,
    createCategory({ id: 'mice', categoryName: 'Mice', shortName: null }),
  ];
}

function createCategory(patch: Partial<ManagementCategory> = {}): ManagementCategory {
  return {
    id: 'category-1',
    categoryName: 'Category',
    shortName: 'Category',
    visible: true,
    hasChildren: false,
    parentId: null,
    depth: 0,
    children: [],
    ...patch,
  };
}
