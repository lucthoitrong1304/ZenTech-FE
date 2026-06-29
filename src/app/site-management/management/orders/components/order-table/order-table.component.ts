import { HasPermissionDirective } from '../../../../../core/permissions/has-permission.directive';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideEye,
  LucidePencil,
  LucideShoppingBag,
} from '@lucide/angular';
import {
  ManagementOrder,
  ManagementPaymentMethod,
} from '../../data-access/models/management-order.models';

@Component({
  selector: 'app-order-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    HasPermissionDirective,
    CurrencyPipe,
    DatePipe,
    LucideChevronLeft,
    LucideChevronRight,
    LucideEye,
    LucidePencil,
    LucideShoppingBag,
  ],
  templateUrl: './order-table.component.html',
  styleUrl: './order-table.component.css',
})
export class OrderTableComponent {
  readonly orders = input.required<ManagementOrder[]>();
  readonly loading = input.required<boolean>();
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalElements = input.required<number>();
  readonly pageStart = input.required<number>();
  readonly pageEnd = input.required<number>();
  readonly canGoPrevious = input.required<boolean>();
  readonly canGoNext = input.required<boolean>();

  readonly viewOrder = output<string>();
  readonly editOrder = output<ManagementOrder>();
  readonly pageChange = output<number>();

  protected readonly skeletonRows = Array.from({ length: 4 });
  protected readonly pageSlots = Array.from({ length: 5 }, (_, index) => index);

  protected getStatusLabel(order: ManagementOrder): string {
    if (order.orderStatus === 'CREATED') {
      if (order.paymentMethod === 'CASH') {
        return 'Chờ xác nhận COD';
      }

      return order.paymentStatus === 'SUCCESS' ? 'Chờ xác nhận' : 'Chờ thanh toán';
    }

    switch (order.orderStatus) {
      case 'CONFIRMED':
        return 'Đã xác nhận';
      case 'SHIPPED':
        return 'Đang giao';
      case 'COMPLETED':
        return 'Đã hoàn thành';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'RETURN_REQUESTED':
        return 'Yêu cầu trả hàng';
      case 'RETURNED':
        return 'Đã trả hàng';
      default:
        return order.orderStatus;
    }
  }

  protected getPaymentMethodLabel(method: ManagementPaymentMethod): string {
    switch (method) {
      case 'CASH':
        return 'COD';
      default:
        return method;
    }
  }

  protected getPageNumber(slot: number): number | null {
    const totalPages = this.totalPages();

    if (totalPages <= 0) {
      return null;
    }

    const start = Math.min(Math.max(this.page() - 2, 0), Math.max(totalPages - 5, 0));
    const page = start + slot;

    return page < totalPages ? page : null;
  }

  protected getInitials(value?: string | null): string {
    const initials = (value || 'ZT')
      .trim()
      .split(/\s+|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
    return initials || 'ZT';
  }

  protected getAvatarGradient(seed?: string | null): string {
    const text = seed || 'zentech';
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #2af598 0%, #009efd 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
      'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
      'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
      'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    ];
    return gradients[Math.abs(hash) % gradients.length];
  }
}
