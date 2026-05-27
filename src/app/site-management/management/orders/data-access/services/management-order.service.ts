import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ApiService } from '../../../../../core/api/api.service';
import {
  ManagementOrder,
  ManagementOrderEditDraft,
  ManagementOrderPage,
  ManagementOrderQuery,
} from '../models/management-order.models';

@Injectable({
  providedIn: 'root',
})
export class ManagementOrderService {
  private readonly apiService = inject(ApiService);
  private readonly ordersBaseUrl = `${environment.apiBaseUrl}/management/orders`;

  getOrders(query: ManagementOrderQuery): Observable<ManagementOrderPage> {
    const params: Record<string, string | number | boolean> = {
      page: query.page,
      size: query.size,
      sort: query.sort,
    };

    const keyword = query.keyword.trim();
    if (keyword) {
      params['keyword'] = keyword;
    }

    if (query.status !== 'all') {
      params['orderStatus'] = query.status;
    }

    // Date range calculation
    const now = new Date();
    let startDate: string | null = null;
    let endDate: string | null = null;

    if (query.dateFilter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = start.toISOString();
    } else if (query.dateFilter === 'last7days') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = start.toISOString();
    } else if (query.dateFilter === 'last30days') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = start.toISOString();
    }

    if (startDate) {
      params['startDate'] = startDate;
    }
    if (endDate) {
      params['endDate'] = endDate;
    }

    return this.apiService
      .get<ApiResponseDto<PageResponseDto<OrderSummaryResponseDto>>>(this.ordersBaseUrl, {
        params,
      })
      .pipe(
        map((response) => ({
          orders: response.data.content.map(toManagementOrderFromSummary),
          page: response.data.page,
          size: response.data.size,
          totalElements: response.data.totalElements,
          totalPages: response.data.totalPages,
          last: response.data.last,
        }))
      );
  }

  getOrderDetail(orderId: string): Observable<ManagementOrder> {
    return this.apiService
      .get<ApiResponseDto<OrderDetailResponseDto>>(`${this.ordersBaseUrl}/${orderId}`)
      .pipe(map((response) => toManagementOrderFromDetail(response.data)));
  }

  updateOrder(draft: ManagementOrderEditDraft): Observable<ManagementOrder> {
    const payload: OrderUpdateRequestDto = {
      orderStatus: draft.orderStatus,
      customerName: draft.customerName,
      shippingAddress: draft.shippingAddress,
      items: draft.items.map((item) => ({
        orderItemId: item.orderItemId,
        quantity: item.quantity,
      })),
    };

    return this.apiService
      .patch<OrderUpdateRequestDto, ApiResponseDto<OrderDetailResponseDto>>(
        `${this.ordersBaseUrl}/${draft.orderId}`,
        payload
      )
      .pipe(map((response) => toManagementOrderFromDetail(response.data)));
  }

  markDelivered(orderId: string): Observable<ManagementOrder> {
    const payload: OrderUpdateRequestDto = {
      orderStatus: 'COMPLETED',
      paymentStatus: 'SUCCESS',
    };

    return this.apiService
      .patch<OrderUpdateRequestDto, ApiResponseDto<OrderDetailResponseDto>>(
        `${this.ordersBaseUrl}/${orderId}`,
        payload
      )
      .pipe(map((response) => toManagementOrderFromDetail(response.data)));
  }
}

interface ApiResponseDto<T> {
  success: boolean;
  data: T;
  message: string;
}

interface PageResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

interface OrderCustomerResponseDto {
  customerId: string;
  fullName: string | null;
  email: string | null;
}

interface OrderSummaryResponseDto {
  orderId: string;
  createdAt: string;
  orderStatus: ManagementOrder['orderStatus'];
  paymentStatus: ManagementOrder['paymentStatus'];
  paymentMethod: ManagementOrder['paymentMethod'];
  originalTotalPrice: number;
  discountAmount: number;
  shippingFee: number;
  finalPrice: number;
  itemCount: number;
  customer: OrderCustomerResponseDto;
}

interface OrderAddressResponseDto {
  addressId: string;
  phoneNumber: string | null;
  province: string | null;
  ward: string | null;
  street: string | null;
}

interface OrderItemResponseDto {
  orderItemId: string;
  productVariantId: string;
  productName: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  productImage: string | null;
}

interface OrderDetailResponseDto {
  orderId: string;
  createdAt: string;
  orderStatus: ManagementOrder['orderStatus'];
  paymentStatus: ManagementOrder['paymentStatus'];
  paymentMethod: ManagementOrder['paymentMethod'];
  originalTotalPrice: number;
  discountAmount: number;
  shippingFee: number;
  finalPrice: number;
  customer: OrderCustomerResponseDto;
  shippingAddress: OrderAddressResponseDto | null;
  items: OrderItemResponseDto[];
}

interface OrderUpdateRequestDto {
  orderStatus?: ManagementOrder['orderStatus'];
  paymentStatus?: ManagementOrder['paymentStatus'];
  shippingFee?: number;
  customerName?: string;
  shippingAddress?: string;
  items?: { orderItemId: string; quantity: number }[];
}

function formatAddress(address: OrderAddressResponseDto | null): string {
  if (!address) {
    return 'Chưa có địa chỉ giao hàng';
  }
  const parts = [address.street, address.ward, address.province].filter(Boolean);
  return parts.join(', ');
}

function toManagementOrderFromSummary(dto: OrderSummaryResponseDto): ManagementOrder {
  return {
    orderId: dto.orderId,
    orderCode: dto.orderId.substring(0, 8).toUpperCase(),
    createdAt: dto.createdAt,
    customer: {
      fullName: dto.customer?.fullName?.trim() || 'Khách hàng chưa đặt tên',
      email: dto.customer?.email?.trim() || 'unknown@zentech.vn',
      shippingAddress: '',
    },
    paymentMethod: dto.paymentMethod,
    paymentStatus: dto.paymentStatus,
    orderStatus: dto.orderStatus,
    subtotal: dto.originalTotalPrice,
    shippingFee: dto.shippingFee,
    discountAmount: dto.discountAmount,
    finalPrice: dto.finalPrice,
    items: [],
  };
}

function toManagementOrderFromDetail(dto: OrderDetailResponseDto): ManagementOrder {
  return {
    orderId: dto.orderId,
    orderCode: dto.orderId.substring(0, 8).toUpperCase(),
    createdAt: dto.createdAt,
    customer: {
      fullName: dto.customer?.fullName?.trim() || 'Khách hàng chưa đặt tên',
      email: dto.customer?.email?.trim() || 'unknown@zentech.vn',
      shippingAddress: formatAddress(dto.shippingAddress),
    },
    paymentMethod: dto.paymentMethod,
    paymentStatus: dto.paymentStatus,
    orderStatus: dto.orderStatus,
    subtotal: dto.originalTotalPrice,
    shippingFee: dto.shippingFee,
    discountAmount: dto.discountAmount,
    finalPrice: dto.finalPrice,
    items: (dto.items || []).map((item) => ({
      orderItemId: item.orderItemId,
      productName: item.productName || 'Sản phẩm không xác định',
      variantName: item.variantName || null,
      productImage: item.productImage || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  };
}
