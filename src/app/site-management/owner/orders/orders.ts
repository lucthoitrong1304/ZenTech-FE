import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { OrderStatusDialog } from './order-status/order-status-dialog.component';

export enum OrderStatus {
  PENDING = 'Chờ xác nhận',
  PROCESSING = 'Đang xử lý',
  SHIPPED = 'Đang giao hàng',
  DELIVERED = 'Đã giao thành công',
  CANCELED = 'Đã hủy',
  RETURNED = 'Hoàn trả',
}

export enum PaymentMethod {
  COD = 'Tiền mặt',
  BANK_TRANSFER = 'Chuyển khoản',
}

export enum TimeRange {
  TODAY = 'TODAY',
  DAYS_7 = '7DAYS',
  DAYS_30 = '30DAYS',
  ALL = 'ALL',
  CUSTOM = 'CUSTOM',
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Order {
  id: string;
  orderCode: string;
  customer: Customer;
  createdAt: Date;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  totalAmount: number;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatMenuModule,
    MatDividerModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
  ],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit {
  searchQuery: string = '';
  selectedStatus: OrderStatus | 'ALL' = 'ALL';
  selectedTimeRange: TimeRange = TimeRange.ALL;
  selectedPaymentMethod: PaymentMethod | 'ALL' = 'ALL';

  statusEnum = OrderStatus;

  statusOptions = Object.values(OrderStatus).map((value) => ({
    label: value,
    value: value,
  }));

  timeRangeOptions = [
    { label: 'Hôm nay', value: TimeRange.TODAY },
    { label: '7 ngày qua', value: TimeRange.DAYS_7 },
    { label: '30 ngày qua', value: TimeRange.DAYS_30 },
    { label: 'Tất cả thời gian', value: TimeRange.ALL },
    { label: 'Tùy chỉnh...', value: TimeRange.CUSTOM },
  ];

  paymentMethodOptions = Object.values(PaymentMethod).map((value) => ({
    label: value,
    value: value,
  }));

  constructor(
    private dialog: MatDialog,
    private router: Router,
  ) {}

  displayedColumns: string[] = [
    'orderCode',
    'customer',
    'createdAt',
    'totalAmount',
    'paymentMethod',
    'status',
    'actions',
  ];
  orders: Order[] = [];

  ngOnInit(): void {
    this.orders = [
      {
        id: '1',
        orderCode: '#ORD-2026-001',
        customer: { id: 'c1', name: 'Nguyễn Văn A', email: 'nguyenvana@gmail.com' },
        createdAt: new Date(2026, 2, 14, 10, 30),
        status: OrderStatus.PENDING,
        paymentMethod: PaymentMethod.COD,
        totalAmount: 1250000,
      },
      {
        id: '2',
        orderCode: '#ORD-2026-002',
        customer: {
          id: 'c2',
          name: 'Trần Thị B',
          email: 'tranthib@gmail.com',
          avatarUrl: 'https://i.pravatar.cc/150?img=5',
        },
        createdAt: new Date(2026, 2, 13, 14, 15),
        status: OrderStatus.PROCESSING,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        totalAmount: 8500000,
      },
      {
        id: '3',
        orderCode: '#ORD-2026-003',
        customer: {
          id: 'c3',
          name: 'Lê Hoàng C',
          email: 'lehoangc@gmail.com',
          avatarUrl: 'https://i.pravatar.cc/150?img=12',
        },
        createdAt: new Date(2026, 2, 12, 9, 0),
        status: OrderStatus.SHIPPED,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        totalAmount: 4320000,
      },
      {
        id: '4',
        orderCode: '#ORD-2026-004',
        customer: { id: 'c4', name: 'Phạm Minh D', email: 'phamminhd@gmail.com' },
        createdAt: new Date(2026, 2, 10, 16, 45),
        status: OrderStatus.DELIVERED,
        paymentMethod: PaymentMethod.COD,
        totalAmount: 560000,
      },
      {
        id: '5',
        orderCode: '#ORD-2026-005',
        customer: {
          id: 'c5',
          name: 'Vũ Thanh E',
          email: 'vuthanhe@gmail.com',
          avatarUrl: 'https://i.pravatar.cc/150?img=32',
        },
        createdAt: new Date(2026, 2, 5, 11, 20),
        status: OrderStatus.CANCELED,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        totalAmount: 2100000,
      },
      {
        id: '6',
        orderCode: '#ORD-2026-006',
        customer: { id: 'c6', name: 'Đặng Ngọc F', email: 'dangngocf@gmail.com' },
        createdAt: new Date(2026, 2, 1, 8, 10),
        status: OrderStatus.RETURNED,
        paymentMethod: PaymentMethod.COD,
        totalAmount: 3450000,
      },
    ];
  }

  getStatusClass(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:
        return 'order-status--pending';
      case OrderStatus.PROCESSING:
        return 'order-status--processing';
      case OrderStatus.SHIPPED:
        return 'order-status--shipped';
      case OrderStatus.DELIVERED:
        return 'order-status--delivered';
      case OrderStatus.CANCELED:
        return 'order-status--canceled';
      case OrderStatus.RETURNED:
        return 'order-status--returned';
      default:
        return 'order-status--default';
    }
  }

  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  openUpdateStatusDialog(order: Order): void {
    const dialogRef = this.dialog.open(OrderStatusDialog, {
      width: '600px',
      data: { order: order },
      autoFocus: false,
      panelClass: 'order-status-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        order.status = result.newStatus;
      }
    });
  }

  viewOrderDetail(orderId: string): void {
    this.router.navigate(['/owner/orders', orderId]);
  }
}
