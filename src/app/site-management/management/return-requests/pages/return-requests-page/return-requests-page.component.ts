import { HasPermissionDirective } from '../../../../../core/permissions/has-permission.directive';
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { PaginatorModule } from 'primeng/paginator';
import {
  LucidePackage,
  LucideCheck,
  LucideX,
  LucideInfo,
  LucideAlertCircle,
  LucideSlidersHorizontal,
  LucideSearch,
  LucideCalendar,
  LucideFileDown
} from '@lucide/angular';
import { ReturnRequestStore } from '../../data-access/store/return-request.store';
import { ReturnRequest, ReturnRequestStatus } from '../../data-access/models/return-request.model';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-return-requests-page',
  standalone: true,
  imports: [
    HasPermissionDirective,
    CommonModule,
    FormsModule,
    DialogModule,
    PaginatorModule,
    LucidePackage,
    LucideCheck,
    LucideX,
    LucideInfo,
    LucideAlertCircle,
    LucideSlidersHorizontal,
    LucideSearch,
    LucideCalendar,
    LucideFileDown
  ],
  templateUrl: './return-requests-page.component.html',
  styleUrl: './return-requests-page.component.css',
})
export class ReturnRequestsPageComponent implements OnInit {
  protected readonly store = inject(ReturnRequestStore);
  private readonly toastService = inject(ToastService);
  protected readonly ReturnRequestStatus = ReturnRequestStatus;

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

  protected onKeywordInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.setSearchKeyword(input.value);
  }

  protected onStatusChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.store.setStatusFilter(select.value as 'ALL' | ReturnRequestStatus);
  }

  protected onDateFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.store.setDateFilter(select.value as 'ALL' | 'TODAY' | 'LAST7DAYS' | 'LAST30DAYS');
  }

  protected onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.store.setSortOrder(select.value as 'NEWEST' | 'OLDEST');
  }

  protected onResetFilters(): void {
    this.store.resetFilters();
  }

  protected getInitials(name: string): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  protected getStatusLabel(status: ReturnRequestStatus): string {
    switch (status) {
      case ReturnRequestStatus.PENDING:
        return 'Chờ duyệt';
      case ReturnRequestStatus.APPROVED:
        return 'Đã duyệt';
      case ReturnRequestStatus.REJECTED:
        return 'Từ chối';
      default:
        return status;
    }
  }

  protected getStatusClass(status: ReturnRequestStatus): string {
    switch (status) {
      case ReturnRequestStatus.PENDING:
        return 'status-badge--pending';
      case ReturnRequestStatus.APPROVED:
        return 'status-badge--approved';
      case ReturnRequestStatus.REJECTED:
        return 'status-badge--rejected';
      default:
        return 'status-badge--default';
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

  protected handlePageChange(event: any): void {
    if (event.page !== undefined) {
      this.store.goToPage(event.page);
    }
  }

  protected onStartDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.setStartDate(input.value || null);
  }

  protected onEndDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.setEndDate(input.value || null);
  }

  protected exportReport(): void {
    const list = this.store.requests();
    if (!list || list.length === 0) {
      this.toastService.error('Không có yêu cầu trả hàng nào để xuất báo cáo.');
      return;
    }

    const printedAt = new Date().toLocaleString('vi-VN');
    const rows = list.map((req, idx) => {
      const statusLabel = this.getStatusLabel(req.status);
      const formattedDate = new Date(req.createdAt).toLocaleString('vi-VN');
      return `
        <tr>
          <td class="cell-center">${idx + 1}</td>
          <td class="cell-mono">#${req.orderId}</td>
          <td>${this.escapeHtml(req.customerName)}</td>
          <td>${this.escapeHtml(req.customerEmail || 'Chưa cung cấp')}</td>
          <td>${this.escapeHtml(req.reason)}</td>
          <td>${this.escapeHtml(req.details || '---')}</td>
          <td class="cell-center">${formattedDate}</td>
          <td class="cell-center">${statusLabel}</td>
          <td class="cell-right">${req.finalPrice.toLocaleString('vi-VN')} VND</td>
        </tr>
      `;
    }).join('');

    const workbookHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; color: #111827; }
            table { border-collapse: collapse; }
            .report-title { font-size: 16px; font-weight: bold; color: #111827; text-align: center; background: #FFC700; height: 35px; }
            .report-subtitle { font-size: 11px; color: #374151; text-align: center; background: #FFF7CC; height: 25px; }
            .data-table th { background: #101010; color: #FFFFFF; font-size: 11px; font-weight: bold; border: 1px solid #374151; padding: 8px; text-align: center; }
            .data-table td { border: 1px solid #E5E7EB; padding: 6px 8px; font-size: 11px; }
            .cell-center { text-align: center; }
            .cell-right { text-align: right; }
            .cell-mono { font-family: monospace; }
          </style>
        </head>
        <body>
          <table>
            <tr><td class="report-title" colspan="9">BÁO CÁO YÊU CẦU TRẢ HÀNG</td></tr>
            <tr><td class="report-subtitle" colspan="9">Hệ thống ZenTech · Thời gian xuất: ${printedAt}</td></tr>
            <tr><td colspan="9"></td></tr>
          </table>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 50px;">STT</th>
                <th style="width: 250px;">Mã đơn hàng</th>
                <th style="width: 180px;">Khách hàng</th>
                <th style="width: 200px;">Email</th>
                <th style="width: 150px;">Lý do trả hàng</th>
                <th style="width: 250px;">Mô tả chi tiết</th>
                <th style="width: 150px;">Ngày yêu cầu</th>
                <th style="width: 100px;">Trạng thái</th>
                <th style="width: 130px;">Tổng tiền đơn</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const excelContent = `\uFEFF${workbookHtml}`;
    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bao-cao-yeu-cau-tra-hang-${new Date().toISOString().slice(0, 10)}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.toastService.success('Xuất file Excel báo cáo trả hàng thành công!');
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
