import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import {
  ManagementOrder,
  ManagementOrderEditDraft,
  ManagementOrderPage,
  ManagementOrderQuery,
} from '../models/management-order.models';

const MOCK_ORDERS: ManagementOrder[] = [
  {
    orderId: 'order-5501',
    orderCode: 'ORD-5501',
    createdAt: '2026-05-25T14:30:00+07:00',
    customer: {
      fullName: 'Le Hong Phong',
      email: 'phong.le@example.com',
      shippingAddress: '123 Duong Le Loi, Phuong Ben Nghe, Quan 1, TP. Ho Chi Minh',
    },
    paymentMethod: 'MOMO',
    paymentStatus: 'PAID',
    orderStatus: 'PROCESSING',
    subtotal: 3500000,
    shippingFee: 30000,
    discountAmount: 0,
    finalPrice: 3530000,
    items: [
      {
        orderItemId: 'item-5501-1',
        productName: 'Ban phim V60 Pro HE',
        variantName: 'Phien ban gioi han',
        productImage: null,
        quantity: 1,
        unitPrice: 3500000,
      },
    ],
  },
  {
    orderId: 'order-5498',
    orderCode: 'ORD-5498',
    createdAt: '2026-05-25T11:15:00+07:00',
    customer: {
      fullName: 'Nguyen Thuy Linh',
      email: 'linh.nt@example.com',
      shippingAddress: '45 Nguyen Trai, Phuong Ben Thanh, Quan 1, TP. Ho Chi Minh',
    },
    paymentMethod: 'VNPAY',
    paymentStatus: 'PAID',
    orderStatus: 'DELIVERED',
    subtotal: 450000,
    shippingFee: 0,
    discountAmount: 20000,
    finalPrice: 430000,
    items: [
      {
        orderItemId: 'item-5498-1',
        productName: 'Chuot gaming Zen X1',
        variantName: 'Black',
        productImage: null,
        quantity: 1,
        unitPrice: 450000,
      },
    ],
  },
  {
    orderId: 'order-5495',
    orderCode: 'ORD-5495',
    createdAt: '2026-05-25T09:45:00+07:00',
    customer: {
      fullName: 'Tran Minh Quan',
      email: 'quan.tm@example.com',
      shippingAddress: '88 Cach Mang Thang Tam, Quan 3, TP. Ho Chi Minh',
    },
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    orderStatus: 'PAYMENT_PENDING',
    subtotal: 2800000,
    shippingFee: 30000,
    discountAmount: 0,
    finalPrice: 2830000,
    items: [
      {
        orderItemId: 'item-5495-1',
        productName: 'Tai nghe ZenPods Max',
        variantName: 'Graphite',
        productImage: null,
        quantity: 2,
        unitPrice: 1400000,
      },
    ],
  },
  {
    orderId: 'order-5490',
    orderCode: 'ORD-5490',
    createdAt: '2026-05-24T20:20:00+07:00',
    customer: {
      fullName: 'Pham Tuan Anh',
      email: 'anh.pt@example.com',
      shippingAddress: '12 Ly Thuong Kiet, Quan 10, TP. Ho Chi Minh',
    },
    paymentMethod: 'MOMO',
    paymentStatus: 'REFUNDED',
    orderStatus: 'CANCELLED',
    subtotal: 120000,
    shippingFee: 20000,
    discountAmount: 0,
    finalPrice: 140000,
    items: [
      {
        orderItemId: 'item-5490-1',
        productName: 'Cap sac USB-C 100W',
        variantName: null,
        productImage: null,
        quantity: 1,
        unitPrice: 120000,
      },
    ],
  },
  {
    orderId: 'order-5487',
    orderCode: 'ORD-5487',
    createdAt: '2026-05-20T16:05:00+07:00',
    customer: {
      fullName: 'Hoang Gia Bao',
      email: 'bao.hg@example.com',
      shippingAddress: '19 Dien Bien Phu, Quan Binh Thanh, TP. Ho Chi Minh',
    },
    paymentMethod: 'VNPAY',
    paymentStatus: 'PAID',
    orderStatus: 'PROCESSING',
    subtotal: 6250000,
    shippingFee: 0,
    discountAmount: 250000,
    finalPrice: 6000000,
    items: [
      {
        orderItemId: 'item-5487-1',
        productName: 'Man hinh ZenView 27 Pro',
        variantName: '2K 165Hz',
        productImage: null,
        quantity: 1,
        unitPrice: 6250000,
      },
    ],
  },
  {
    orderId: 'order-5482',
    orderCode: 'ORD-5482',
    createdAt: '2026-05-12T10:15:00+07:00',
    customer: {
      fullName: 'Do Khanh Vy',
      email: 'vy.dk@example.com',
      shippingAddress: '77 Nguyen Van Linh, Quan 7, TP. Ho Chi Minh',
    },
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    orderStatus: 'PROCESSING',
    subtotal: 1850000,
    shippingFee: 30000,
    discountAmount: 50000,
    finalPrice: 1830000,
    items: [
      {
        orderItemId: 'item-5482-1',
        productName: 'Loa ZenSound Mini',
        variantName: 'Silver',
        productImage: null,
        quantity: 1,
        unitPrice: 1850000,
      },
    ],
  },
];

@Injectable({
  providedIn: 'root',
})
export class ManagementOrderMockService {
  private orders = [...MOCK_ORDERS];

  getOrders(query: ManagementOrderQuery): Observable<ManagementOrderPage> {
    const filtered = this.filterOrders(this.orders, query);
    const sorted = this.sortOrders(filtered, query.sort);
    const start = query.page * query.size;
    const pageOrders = sorted.slice(start, start + query.size);
    const totalPages = Math.ceil(sorted.length / query.size);

    return of({
      orders: pageOrders,
      page: query.page,
      size: query.size,
      totalElements: sorted.length,
      totalPages,
      last: totalPages === 0 || query.page + 1 >= totalPages,
    });
  }

  updateOrder(draft: ManagementOrderEditDraft): Observable<ManagementOrder> {
    const order = this.orders.find(item => item.orderId === draft.orderId);

    if (!order) {
      return throwError(() => new Error('Order not found.'));
    }

    const nextItems = order.items.map(item => {
      const draftItem = draft.items.find(candidate => candidate.orderItemId === item.orderItemId);
      const quantity = Math.max(1, draftItem?.quantity ?? item.quantity);

      return { ...item, quantity };
    });
    const subtotal = nextItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const updated: ManagementOrder = {
      ...order,
      customer: {
        ...order.customer,
        fullName: draft.customerName.trim(),
        shippingAddress: draft.shippingAddress.trim(),
      },
      orderStatus: draft.orderStatus,
      items: nextItems,
      subtotal,
      finalPrice: subtotal + order.shippingFee - order.discountAmount,
    };

    this.orders = this.orders.map(item => (item.orderId === updated.orderId ? updated : item));

    return of(updated);
  }

  markDelivered(orderId: string): Observable<ManagementOrder> {
    const order = this.orders.find(item => item.orderId === orderId);

    if (!order) {
      return throwError(() => new Error('Order not found.'));
    }

    const updated: ManagementOrder = { ...order, orderStatus: 'DELIVERED', paymentStatus: 'PAID' };
    this.orders = this.orders.map(item => (item.orderId === updated.orderId ? updated : item));

    return of(updated);
  }

  private filterOrders(orders: ManagementOrder[], query: ManagementOrderQuery): ManagementOrder[] {
    const keyword = query.keyword.trim().toLowerCase();
    const now = new Date('2026-05-26T00:00:00+07:00');

    return orders.filter(order => {
      const matchesKeyword =
        !keyword ||
        order.orderCode.toLowerCase().includes(keyword) ||
        order.customer.fullName.toLowerCase().includes(keyword) ||
        order.customer.email.toLowerCase().includes(keyword);
      const matchesStatus = query.status === 'all' || order.orderStatus === query.status;
      const matchesDate = matchesDateFilter(order.createdAt, query.dateFilter, now);

      return matchesKeyword && matchesStatus && matchesDate;
    });
  }

  private sortOrders(orders: ManagementOrder[], sort: ManagementOrderQuery['sort']): ManagementOrder[] {
    return [...orders].sort((left, right) => {
      switch (sort) {
        case 'createdAt,asc':
          return left.createdAt.localeCompare(right.createdAt);
        case 'finalPrice,desc':
          return right.finalPrice - left.finalPrice;
        case 'finalPrice,asc':
          return left.finalPrice - right.finalPrice;
        case 'createdAt,desc':
        default:
          return right.createdAt.localeCompare(left.createdAt);
      }
    });
  }
}

function matchesDateFilter(
  createdAt: string,
  dateFilter: ManagementOrderQuery['dateFilter'],
  now: Date
): boolean {
  if (dateFilter === 'all') {
    return true;
  }

  const createdDate = new Date(createdAt);
  const diffMs = now.getTime() - createdDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (dateFilter === 'today') {
    return createdDate.toDateString() === now.toDateString();
  }

  return dateFilter === 'last7days' ? diffDays <= 7 : diffDays <= 30;
}
