import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '../../../../../../environments/environment';
import { ApiService } from '../../../../../core/api/api.service';
import { CustomerService } from './customer.service';

describe('CustomerService', () => {
  const customersUrl = `${environment.apiBaseUrl}/owner/customers`;

  function configureService(api: object): CustomerService {
    TestBed.configureTestingModule({
      providers: [
        CustomerService,
        {
          provide: ApiService,
          useValue: api,
        },
      ],
    });

    return TestBed.inject(CustomerService);
  }

  it('loads customers with backend query params and unwraps ApiResponse data', async () => {
    const get = vi.fn(() =>
      of({
        success: true,
        message: 'OK',
        data: {
          content: [
            {
              customerId: 'customer-1',
              fullName: 'Alice Nguyen',
              email: 'alice@example.com',
              active: true,
              registeredAt: '2026-04-15T10:15:30Z',
              totalOrders: 3,
              totalSpent: 1500000,
              lastOrderAt: '2026-04-16T08:00:00Z',
            },
          ],
          page: 0,
          size: 10,
          totalElements: 1,
          totalPages: 1,
          last: true,
        },
      })
    );
    const service = configureService({ get });

    const page = await firstValueFrom(
      service.getCustomers({
        page: 0,
        size: 10,
        sort: 'registeredAt,desc',
        keyword: ' alice ',
        activeFilter: 'active',
      })
    );

    expect(get).toHaveBeenCalledWith(customersUrl, {
      params: {
        page: 0,
        size: 10,
        sort: 'registeredAt,desc',
        keyword: 'alice',
        active: true,
      },
    });
    expect(page.content[0]).toEqual({
      customerId: 'customer-1',
      fullName: 'Alice Nguyen',
      email: 'alice@example.com',
      active: true,
      registeredAt: '2026-04-15T10:15:30Z',
      totalOrders: 3,
      totalSpent: 1500000,
      lastOrderAt: '2026-04-16T08:00:00Z',
    });
    expect(page.totalElements).toBe(1);
  });

  it('omits active and blank keyword params when all customers are requested', async () => {
    const get = vi.fn(() =>
      of({
        success: true,
        message: 'OK',
        data: {
          content: [],
          page: 0,
          size: 10,
          totalElements: 0,
          totalPages: 0,
          last: true,
        },
      })
    );
    const service = configureService({ get });

    await firstValueFrom(
      service.getCustomers({
        page: 0,
        size: 10,
        sort: 'email,asc',
        keyword: '   ',
        activeFilter: 'all',
      })
    );

    expect(get).toHaveBeenCalledWith(customersUrl, {
      params: {
        page: 0,
        size: 10,
        sort: 'email,asc',
      },
    });
  });

  it('loads customer detail and order history from owner endpoints', async () => {
    const get = vi
      .fn()
      .mockReturnValueOnce(
        of({
          success: true,
          message: 'OK',
          data: {
            customerId: 'customer-1',
            fullName: 'Alice Nguyen',
            email: 'alice@example.com',
            active: true,
            registeredAt: '2026-04-15T10:15:30Z',
            addressList: [
              {
                addressId: 'address-1',
                phoneNumber: '0909000000',
                province: 'Ho Chi Minh',
                ward: 'Ward 1',
                street: '1 Nguyen Hue',
                isDefault: true,
                createdAt: '2026-04-15T10:20:00Z',
                updatedAt: null,
              },
            ],
            totalOrders: 2,
            totalSpent: 500000,
            lastOrderAt: '2026-04-16T08:00:00Z',
          },
        })
      )
      .mockReturnValueOnce(
        of({
          success: true,
          message: 'OK',
          data: {
            content: [
              {
                orderId: 'order-1',
                createdAt: '2026-04-16T08:00:00Z',
                orderStatus: 'COMPLETED',
                paymentStatus: 'SUCCESS',
                paymentMethod: 'VNPAY',
                finalPrice: 500000,
                shippingFee: 20000,
                discountAmount: 0,
                items: [
                  {
                    orderItemId: 'item-1',
                    productVariantId: 'variant-1',
                    productName: 'Zen Keyboard',
                    variantName: 'Black',
                    quantity: 1,
                    priceAtPurchase: 500000,
                    lineTotal: 500000,
                  },
                ],
              },
            ],
            page: 0,
            size: 5,
            totalElements: 1,
            totalPages: 1,
            last: true,
          },
        })
      );
    const service = configureService({ get });

    const detail = await firstValueFrom(service.getCustomerDetail('customer-1'));
    const orders = await firstValueFrom(
      service.getCustomerOrders('customer-1', {
        page: 0,
        size: 5,
        sort: 'createdAt,desc',
      })
    );

    expect(get).toHaveBeenNthCalledWith(1, `${customersUrl}/customer-1`);
    expect(get).toHaveBeenNthCalledWith(2, `${customersUrl}/customer-1/orders`, {
      params: {
        page: 0,
        size: 5,
        sort: 'createdAt,desc',
      },
    });
    expect(detail.addressList[0].isDefault).toBe(true);
    expect(orders.content[0].items[0].productName).toBe('Zen Keyboard');
  });

  it('updates customer status through the owner status endpoint', async () => {
    const patch = vi.fn(() =>
      of({
        success: true,
        message: 'OK',
        data: null,
      })
    );
    const service = configureService({ patch });

    await firstValueFrom(service.updateCustomerStatus('customer-1', false));

    expect(patch).toHaveBeenCalledWith(`${customersUrl}/customer-1/status`, {
      active: false,
    });
  });
});
