import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ApiService } from '../../../../../core/api/api.service';
import {
  CustomerAddress,
  CustomerDetail,
  CustomerListQuery,
  CustomerOrderHistory,
  CustomerOrderItem,
  CustomerOrderQuery,
  CustomerPage,
  CustomerSummary,
} from '../models/customer.models';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private readonly apiService = inject(ApiService);
  private readonly customersBaseUrl = `${environment.apiBaseUrl}/owner/customers`;

  getCustomers(query: CustomerListQuery): Observable<CustomerPage<CustomerSummary>> {
    const params: Record<string, string | number | boolean> = {
      page: query.page,
      size: query.size,
      sort: query.sort,
    };
    const keyword = query.keyword.trim();

    if (keyword) {
      params['keyword'] = keyword;
    }

    if (query.activeFilter !== 'all') {
      params['active'] = query.activeFilter === 'active';
    }

    return this.apiService
      .get<ApiResponseDto<PageResponseDto<CustomerSummaryResponseDto>>>(this.customersBaseUrl, {
        params,
      })
      .pipe(map((response) => toCustomerPage(response.data, toCustomerSummary)));
  }

  getCustomerDetail(customerId: string): Observable<CustomerDetail> {
    return this.apiService
      .get<ApiResponseDto<CustomerDetailResponseDto>>(`${this.customersBaseUrl}/${customerId}`)
      .pipe(map((response) => toCustomerDetail(response.data)));
  }

  getCustomerOrders(
    customerId: string,
    query: CustomerOrderQuery,
  ): Observable<CustomerPage<CustomerOrderHistory>> {
    return this.apiService
      .get<ApiResponseDto<PageResponseDto<CustomerOrderHistoryResponseDto>>>(
        `${this.customersBaseUrl}/${customerId}/orders`,
        {
          params: {
            page: query.page,
            size: query.size,
            sort: query.sort,
          },
        },
      )
      .pipe(map((response) => toCustomerPage(response.data, toOrderHistory)));
  }

  updateCustomerStatus(customerId: string, active: boolean): Observable<void> {
    return this.apiService
      .patch<
        UpdateCustomerStatusRequestDto,
        ApiResponseDto<unknown>
      >(`${this.customersBaseUrl}/${customerId}/status`, { active })
      .pipe(map(() => undefined));
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

interface CustomerSummaryResponseDto {
  customerId: string;
  fullName: string | null;
  email: string | null;
  active: boolean;
  registeredAt: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

interface CustomerDetailResponseDto extends CustomerSummaryResponseDto {
  addressList: CustomerAddressResponseDto[] | null;
}

interface CustomerAddressResponseDto {
  addressId: string;
  phoneNumber: string | null;
  province: string | null;
  ward: string | null;
  street: string | null;
  isDefault: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

interface CustomerOrderHistoryResponseDto {
  orderId: string;
  createdAt: string | null;
  orderStatus: CustomerOrderHistory['orderStatus'];
  paymentStatus: CustomerOrderHistory['paymentStatus'];
  paymentMethod: CustomerOrderHistory['paymentMethod'];
  finalPrice: number;
  shippingFee: number;
  discountAmount: number;
  items: CustomerOrderItemResponseDto[] | null;
  orderDetails?: CustomerOrderItemResponseDto[] | null;
}

interface CustomerOrderItemResponseDto {
  orderItemId?: string | null;
  productVariantId?: string | null;
  productName: string | null;
  variantName: string | null;
  sku?: string | null;
  productImage?: string | null;
  quantity: number;
  unitPrice?: number | null;
  priceAtPurchase?: number | null;
  lineTotal?: number | null;
  subtotal?: number | null;
}

interface UpdateCustomerStatusRequestDto {
  active: boolean;
}

function toCustomerPage<TDto, TModel>(
  response: PageResponseDto<TDto>,
  mapper: (item: TDto) => TModel,
): CustomerPage<TModel> {
  return {
    content: response.content.map(mapper),
    page: response.page,
    size: response.size,
    totalElements: response.totalElements,
    totalPages: response.totalPages,
    last: response.last,
  };
}

function toCustomerSummary(customer: CustomerSummaryResponseDto): CustomerSummary {
  return {
    customerId: customer.customerId,
    fullName: customer.fullName?.trim() || 'Khách hàng chưa đặt tên',
    email: customer.email?.trim() || 'unknown@zentech.vn',
    active: customer.active,
    registeredAt: customer.registeredAt,
    totalOrders: customer.totalOrders,
    totalSpent: customer.totalSpent,
    lastOrderAt: customer.lastOrderAt,
  };
}

function toCustomerDetail(customer: CustomerDetailResponseDto): CustomerDetail {
  return {
    ...toCustomerSummary(customer),
    addressList: customer.addressList?.map(toCustomerAddress) ?? [],
  };
}

function toCustomerAddress(address: CustomerAddressResponseDto): CustomerAddress {
  return {
    addressId: address.addressId,
    phoneNumber: address.phoneNumber,
    province: address.province,
    ward: address.ward,
    street: address.street,
    isDefault: address.isDefault,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
}

function toOrderHistory(order: CustomerOrderHistoryResponseDto): CustomerOrderHistory {
  const items = order.items ?? order.orderDetails ?? [];

  return {
    orderId: order.orderId,
    createdAt: order.createdAt,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    finalPrice: order.finalPrice,
    shippingFee: order.shippingFee,
    discountAmount: order.discountAmount,
    items: items.map(toOrderItem),
  };
}

function toOrderItem(item: CustomerOrderItemResponseDto): CustomerOrderItem {
  const unitPrice = item.unitPrice ?? item.priceAtPurchase ?? 0;
  const productName = item.productName?.trim() || 'Sản phẩm không xác định';
  const productVariantId = item.productVariantId?.trim() || '';
  const sku = item.sku?.trim() || null;

  return {
    orderItemId: item.orderItemId?.trim() || productVariantId || sku || productName,
    productVariantId,
    productName,
    variantName: item.variantName?.trim() || null,
    sku,
    productImage: item.productImage?.trim() || null,
    quantity: item.quantity,
    unitPrice,
    priceAtPurchase: unitPrice,
    lineTotal: item.lineTotal ?? item.subtotal ?? unitPrice * item.quantity,
  };
}
