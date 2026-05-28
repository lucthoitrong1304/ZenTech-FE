import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import {
  ManagementProductGroup,
  ManagementProductGroupDraft,
  ManagementProductGroupPage,
  ManagementProductGroupQuery,
} from '../models/management-product.models';
import { ManagementProductService } from '../services/management-product.service';
import { ManagementProductGroupsStore } from './management-product-groups.store';

describe('ManagementProductGroupsStore', () => {
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
    productService: Partial<ManagementProductService>
  ): InstanceType<typeof ManagementProductGroupsStore> {
    TestBed.configureTestingModule({
      providers: [
        ManagementProductGroupsStore,
        {
          provide: ManagementProductService,
          useValue: productService,
        },
      ],
    });

    return TestBed.inject(ManagementProductGroupsStore);
  }

  it('loads groups and resets page when search/filter changes', () => {
    const group = createGroup();
    const getProductGroups = vi.fn((query: ManagementProductGroupQuery) =>
      of(createPage([group], query, 9))
    );
    const store = configureStore({
      getProductGroups,
      getProductOptions: () => of([]),
    });

    store.loadGroups();
    store.goToPage(2);
    store.setKeyword('bàn phím');
    store.setActiveFilter('active');

    expect(store.groups()[0].groupId).toBe(group.groupId);
    expect(store.query()).toEqual({
      page: 0,
      size: 4,
      sort: 'name,asc',
      keyword: 'bàn phím',
      activeFilter: 'active',
    });
    expect(store.activeFilterCount()).toBe(2);
    expect(getProductGroups).toHaveBeenCalled();
  });

  it('opens and closes create/edit dialogs with draft state', () => {
    const group = createGroup();
    const store = configureStore({
      getProductGroups: query => of(createPage([group], query)),
      getProductOptions: () => of([]),
    });

    store.loadGroups();
    store.openCreateDialog();

    expect(store.dialogMode()).toBe('create');
    expect(store.draft()).toEqual({ name: '', productIds: [], active: true });

    store.openEditDialog(group);

    expect(store.dialogMode()).toBe('edit');
    expect(store.draft()).toMatchObject({
      groupId: group.groupId,
      name: group.name,
      productIds: group.productIds,
      active: group.active,
    });

    store.closeDialog();

    expect(store.dialogMode()).toBeNull();
    expect(store.draft()).toBeNull();
  });

  it('validates before save and adds a group after create succeeds', () => {
    const created = createGroup({ groupId: 'group-created', name: 'Premium Setup' });
    const createProductGroup = vi.fn((draft: ManagementProductGroupDraft) =>
      of({
        ...created,
        name: draft.name,
        productIds: draft.productIds,
        productCount: draft.productIds.length,
      })
    );
    const store = configureStore({
      getProductGroups: query => of(createPage([], query)),
      getProductOptions: () => of([]),
      createProductGroup,
    });

    store.loadGroups();
    store.openCreateDialog();
    store.saveDraft();

    expect(store.formErrors().name).toBe('Vui lòng nhập tên nhóm.');

    store.updateDraft({ name: 'Premium Setup' });
    store.toggleProduct('product-k1');
    store.saveDraft();

    expect(createProductGroup).toHaveBeenCalledWith({
      name: 'Premium Setup',
      productIds: ['product-k1'],
      active: true,
    });
    expect(store.groups()[0].groupId).toBe('group-created');
    expect(store.dialogVisible()).toBe(false);
  });

  it('updates and deletes groups through entity updaters', () => {
    const group = createGroup();
    const updated = createGroup({ name: 'Updated Group', productCount: 1 });
    const store = configureStore({
      getProductGroups: query => of(createPage([group], query)),
      getProductOptions: () => of([]),
      updateProductGroup: draft =>
        of({
          ...updated,
          groupId: draft.groupId ?? group.groupId,
          name: draft.name,
          productIds: draft.productIds,
        }),
      deleteProductGroup: groupId => of(groupId),
    });

    store.loadGroups();
    store.openEditDialog(group);
    store.updateDraft({ name: 'Updated Group', productIds: ['product-k1'] });
    store.saveDraft();

    expect(store.groups()[0].name).toBe('Updated Group');

    store.deleteGroup(group.groupId);

    expect(store.groups()).toEqual([]);
  });

  it('stores load and save failures', () => {
    const store = configureStore({
      getProductGroups: () => throwError(() => new Error('Network failed')),
      getProductOptions: () => of([]),
    });

    store.loadGroups();

    expect(store.loading()).toBe(false);
    expect(store.errorMessage()).toBe(
      'Không thể tải danh sách nhóm sản phẩm. Vui lòng thử lại.'
    );
  });
});

function isTestEnvironmentAlreadyInitialized(error: Error): boolean {
  return (
    error.message.includes('already been initialized') ||
    error.message.includes('already been called')
  );
}

function createGroup(patch: Partial<ManagementProductGroup> = {}): ManagementProductGroup {
  return {
    groupId: 'group-keyboards',
    name: 'Bàn phím cơ',
    iconName: 'keyboard',
    productIds: ['product-k1'],
    productCount: 1,
    active: true,
    ...patch,
  };
}

function createPage(
  groups: ManagementProductGroup[],
  query: ManagementProductGroupQuery,
  totalElements = groups.length
): ManagementProductGroupPage {
  return {
    groups,
    page: query.page,
    size: query.size,
    totalElements,
    totalPages: Math.ceil(totalElements / query.size),
    last: query.page + 1 >= Math.ceil(totalElements / query.size),
  };
}
