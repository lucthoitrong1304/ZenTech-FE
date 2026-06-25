import {
  buildCategoryReorderItems,
  flattenManagementCategories,
  moveCategoryWithinSiblings,
  toManagementCategoryTree,
} from './management-category.service';
import { ProductCategorySummaryResponseDto } from '../models/management-category.models';

describe('management category mapping helpers', () => {
  it('maps nested backend categories with parent id, depth, and children', () => {
    const tree = toManagementCategoryTree(createBackendTree());

    expect(tree[0]).toMatchObject({
      id: 'root-keyboards',
      categoryName: 'Keyboards',
      shortName: 'Keyboards',
      visible: true,
      hasChildren: true,
      parentId: null,
      depth: 0,
    });
    expect(tree[0].children[0]).toMatchObject({
      id: 'he-keyboards',
      parentId: 'root-keyboards',
      depth: 1,
    });
  });

  it('flattens categories and builds one-based reorder payloads', () => {
    const tree = toManagementCategoryTree(createBackendTree());

    expect(flattenManagementCategories(tree).map(category => category.id)).toEqual([
      'root-keyboards',
      'he-keyboards',
      'mechanical-keyboards',
      'mice',
    ]);
    expect(buildCategoryReorderItems(tree)).toEqual([
      { id: 'root-keyboards', parentId: null, priority: 1 },
      { id: 'he-keyboards', parentId: 'root-keyboards', priority: 1 },
      { id: 'mechanical-keyboards', parentId: 'root-keyboards', priority: 2 },
      { id: 'mice', parentId: null, priority: 2 },
    ]);
  });

  it('moves a category only inside its sibling group', () => {
    const tree = toManagementCategoryTree(createBackendTree());
    const moved = moveCategoryWithinSiblings(tree, 'mechanical-keyboards', 'up');

    expect(moved?.[0].children.map(category => category.id)).toEqual([
      'mechanical-keyboards',
      'he-keyboards',
    ]);
    expect(moved?.map(category => category.id)).toEqual(['root-keyboards', 'mice']);
    expect(moveCategoryWithinSiblings(tree, 'root-keyboards', 'up')).toBeNull();
  });
});

function createBackendTree(): ProductCategorySummaryResponseDto[] {
  return [
    {
      id: 'root-keyboards',
      categoryName: 'Keyboards',
      shortName: 'Keyboards',
      visible: true,
      hasChildren: true,
      children: [
        {
          id: 'he-keyboards',
          categoryName: 'Hall Effect Keyboard',
          shortName: 'HE Keyboard',
          visible: true,
          hasChildren: false,
          children: [],
        },
        {
          id: 'mechanical-keyboards',
          categoryName: 'Mechanical Keyboards',
          shortName: 'Mechanical',
          visible: false,
          hasChildren: false,
          children: [],
        },
      ],
    },
    {
      id: 'mice',
      categoryName: 'Mice',
      shortName: null,
      visible: true,
      hasChildren: false,
      children: null,
    },
  ];
}
