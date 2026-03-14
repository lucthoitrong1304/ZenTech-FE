import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { OrderStatus } from '../orders';

export interface OrderItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl: string;
}

export interface OrderDetail {
  id: string;
  orderCode: string;
  createdAt: Date;
  status: OrderStatus;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatarUrl?: string;
  };
  shippingAddress: {
    recipientName: string;
    street: string;
    ward: string;
    district: string;
    city: string;
    country: string;
    phone: string;
  };
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  timeline: {
    status: OrderStatus | string;
    time: Date;
    isCompleted: boolean;
    isCurrent: boolean;
  }[];
}

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.css'
})
export class OrderDetailComponent implements OnInit {
  order: OrderDetail | null = null;
  statusEnum = OrderStatus;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    // Fetch order by ID. Using mock data for now.
    this.order = {
      id: orderId || '1',
      orderCode: '#ORD-2026-001',
      createdAt: new Date('2026-03-14T10:30:00'),
      status: OrderStatus.PROCESSING,
      customer: {
        id: 'CUS-1023',
        name: 'Nguyễn Văn A',
        email: 'nguyenv1@gmail.com',
        phone: '0901234567',
        avatarUrl: ''
      },
      shippingAddress: {
        recipientName: 'Nguyễn Văn A',
        street: '123 đường Lê Lợi',
        ward: 'Phường Bến Nghé',
        district: 'Quận 1',
        city: 'TP.HCM',
        country: 'Vietnam',
        phone: '0901234567'
      },
      items: [
        {
          id: 'item1',
          name: 'GravaStar Bluetooth Speaker Mars Pro',
          sku: 'GS-SPK-001',
          quantity: 1,
          unitPrice: 1250000,
          totalPrice: 1250000,
          imageUrl: 'https://cdn.shopify.com/s/files/1/0285/1310/8043/products/marspro_black_01.jpg'
        },
        {
          id: 'item2',
          name: 'Mars Pro Wireless Gaming Mouse',
          sku: 'MP-MG-001',
          quantity: 1,
          unitPrice: 3070000,
          totalPrice: 3070000,
          imageUrl: 'https://cdn.shopify.com/s/files/1/0285/1310/8043/products/mouse_m1_black_01.jpg'
        }
      ],
      subtotal: 4320000,
      shippingFee: 30000,
      discount: 0,
      totalAmount: 4350000,
      timeline: [
        { status: 'Đơn hàng đã đặt', time: new Date('2026-03-14T10:30:00'), isCompleted: true, isCurrent: false },
        { status: 'Đã xác nhận đơn', time: new Date('2026-03-14T10:45:00'), isCompleted: true, isCurrent: false },
        { status: 'Đang xử lý', time: new Date('2026-03-14T11:10:00'), isCompleted: true, isCurrent: true },
        { status: 'Đã giao', time: new Date('2026-03-15T09:00:00'), isCompleted: false, isCurrent: false }
      ]
    };
  }

  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }
}
