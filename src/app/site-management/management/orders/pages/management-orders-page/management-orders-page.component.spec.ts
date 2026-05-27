import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ManagementOrderService } from '../../data-access/services/management-order.service';
import { ManagementOrdersPageComponent } from './management-orders-page.component';

describe('ManagementOrdersPageComponent', () => {
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

  it('renders the orders command surface and mock orders', async () => {
    await TestBed.configureTestingModule({
      imports: [ManagementOrdersPageComponent],
      providers: [
        {
          provide: ToastService,
          useValue: {
            success: vi.fn(),
            error: vi.fn(),
          },
        },
        {
          provide: ManagementOrderService,
          useValue: {
            getOrders: () => of({
              orders: [
                {
                  orderId: 'order-1',
                  orderCode: 'ORD-5501',
                  createdAt: '2026-05-25T14:30:00+07:00',
                  customer: {
                    fullName: 'Le Hong Phong',
                    email: 'phong.le@example.com',
                    shippingAddress: '123 Duong Le Loi, Quan 1, TP. Ho Chi Minh',
                  },
                  paymentMethod: 'MOMO',
                  paymentStatus: 'SUCCESS',
                  orderStatus: 'CONFIRMED',
                  subtotal: 3500000,
                  shippingFee: 30000,
                  discountAmount: 0,
                  finalPrice: 3530000,
                  items: [],
                }
              ],
              page: 0,
              size: 4,
              totalElements: 1,
              totalPages: 1,
              last: true,
            }),
            getOrderDetail: () => of(null),
            updateOrder: () => of(null),
            markDelivered: () => of(null),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ManagementOrdersPageComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Quản lý Đơn hàng');
    expect(text).toContain('#ORD-5501');
    expect(text).toContain('Xuất báo cáo');
  });
});

function isTestEnvironmentAlreadyInitialized(error: Error): boolean {
  return (
    error.message.includes('already been initialized') ||
    error.message.includes('already been called')
  );
}
