import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { LucidePackage, LucideCheck, LucideX, LucideInfo, LucideAlertCircle } from '@lucide/angular';
import { ReturnRequestStore } from '../../data-access/store/return-request.store';
import { ReturnRequest } from '../../data-access/models/return-request.model';

@Component({
  selector: 'app-return-requests-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    LucidePackage,
    LucideCheck,
    LucideX,
    LucideInfo,
    LucideAlertCircle
  ],
  templateUrl: './return-requests-page.component.html',
})
export class ReturnRequestsPageComponent implements OnInit {
  protected readonly store = inject(ReturnRequestStore);

  protected isDetailOpen = false;
  protected resellable = true;

  ngOnInit(): void {
    this.store.loadRequests();
  }

  protected viewRequest(request: ReturnRequest): void {
    this.store.selectRequestId(request.id);
    this.resellable = true;
    this.isDetailOpen = true;
  }

  protected handleApprove(id: string): void {
    this.store.approveRequest({ id, resellable: this.resellable });
    this.isDetailOpen = false;
  }

  protected handleReject(id: string): void {
    this.store.rejectRequest(id);
    this.isDetailOpen = false;
  }

  protected getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'Chờ duyệt';
      case 'APPROVED':
        return 'Đã duyệt';
      case 'REJECTED':
        return 'Từ chối';
      default:
        return status;
    }
  }

  protected getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800 border border-rose-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  protected isVideo(url: string): boolean {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.webm');
  }

  protected isImage(url: string): boolean {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg') || cleanUrl.endsWith('.png') || cleanUrl.endsWith('.webp') || cleanUrl.endsWith('.gif');
  }

  protected getShortOrderId(orderId: string): string {
    if (!orderId) return '';
    return orderId.substring(0, 8).toUpperCase();
  }
}
