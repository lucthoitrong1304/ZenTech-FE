import { firstValueFrom } from 'rxjs';
import { ManagementProductMockService } from './management-product-mock.service';

describe('ManagementProductMockService', () => {
  let service: ManagementProductMockService;

  beforeEach(() => {
    service = new ManagementProductMockService();
  });

  it('filters and paginates products by keyword and stock status', async () => {
    const page = await firstValueFrom(
      service.getProducts({
        page: 0,
        size: 2,
        sort: 'name,asc',
        keyword: 'zen',
        categoryId: 'all',
        stockStatus: 'IN_STOCK',
      })
    );

    expect(page.products.length).toBeLessThanOrEqual(2);
    expect(page.products.every(product => product.status === 'IN_STOCK')).toBe(true);
    expect(page.products.every(product => product.name.toLowerCase().includes('zen'))).toBe(true);
  });

  it('creates, updates, and deletes product groups', async () => {
    const created = await firstValueFrom(
      service.createProductGroup({
        name: 'Premium Setup',
        productIds: ['product-k1', 'product-display'],
        active: true,
      })
    );

    expect(created.name).toBe('Premium Setup');
    expect(created.productCount).toBe(2);

    const updated = await firstValueFrom(
      service.updateProductGroup({
        groupId: created.groupId,
        name: 'Premium Desk Setup',
        productIds: ['product-k1'],
        active: false,
      })
    );

    expect(updated.name).toBe('Premium Desk Setup');
    expect(updated.productCount).toBe(1);
    expect(updated.active).toBe(false);

    await expect(firstValueFrom(service.deleteProductGroup(created.groupId))).resolves.toBe(
      created.groupId
    );
  });
});
