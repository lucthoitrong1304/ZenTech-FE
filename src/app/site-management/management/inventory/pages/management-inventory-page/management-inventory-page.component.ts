import { HasPermissionDirective } from '../../../../../core/permissions/has-permission.directive';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, ChangeDetectionStrategy, effect, inject, untracked, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideSearch,
  LucideWarehouse,
  LucideTriangleAlert,
  LucideChevronRight,
  LucideSparkles,
  LucidePackage,
  LucideHistory,
  LucidePlus,
  LucideTrendingUp,
  LucideTrendingDown,
  LucideX,
  LucideLayoutGrid,
  LucideLayoutList,
  LucideDownload,
  LucidePrinter,
  LucideCalendar,
  LucideCopy,
} from '@lucide/angular';
import { SelectModule } from 'primeng/select';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DatePicker } from 'primeng/datepicker';
import { PopoverModule } from 'primeng/popover';
import { ManagementPageShellComponent } from '../../../../../shared/components/management-ui';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ManagementInventoryStore } from '../../data-access/store/management-inventory.store';
import { InventoryAdjustDialogComponent } from '../../components/inventory-adjust-dialog/inventory-adjust-dialog.component';
import { InventoryAiDialogComponent } from '../../components/inventory-ai-dialog/inventory-ai-dialog.component';
import {
  InventorySummary,
  InventoryAdjustmentRequest,
  StockStatusOption,
  TransactionTypeFilterOption,
  InventoryTransactionType,
  InventoryTransactionReason,
} from '../../data-access/models/inventory.model';

interface InventoryStaffFilterOption {
  label: string;
  value: string;
  email: string;
  avatarUrl: string | null;
}

enum InventoryDateFilterOption {
  ALL = 'all',
  TODAY = 'today',
  LAST_7_DAYS = 'last7days',
  THIS_MONTH = 'thismonth',
  LAST_MONTH = 'lastmonth',
  CUSTOM = 'custom',
}

@Component({
  selector: 'app-management-inventory-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    HasPermissionDirective,
    CommonModule,
    FormsModule,
    CurrencyPipe,
    InventoryAdjustDialogComponent,
    InventoryAiDialogComponent,
    SelectModule,
    PaginatorModule,
    TableModule,
    TagModule,
    ButtonModule,
    TooltipModule,
    LucideSearch,
    LucideWarehouse,
    LucideTriangleAlert,
    LucideChevronRight,
    LucideSparkles,
    LucidePackage,
    LucideHistory,
    LucidePlus,
    LucideTrendingUp,
    LucideTrendingDown,
    LucideX,
    LucideLayoutGrid,
    LucideLayoutList,
    LucideDownload,
    LucidePrinter,
    LucideCalendar,
    DatePicker,
    PopoverModule,
    LucideCopy,
    ManagementPageShellComponent,
  ],
  templateUrl: './management-inventory-page.component.html',
  styleUrl: './management-inventory-page.component.css',
  providers: [ManagementInventoryStore],
})
export class ManagementInventoryPageComponent {
  protected readonly store = inject(ManagementInventoryStore);
  private readonly toastService = inject(ToastService);

  protected readonly viewMode = signal<'table' | 'card'>(
    (localStorage.getItem('management_inventory_view_mode') as 'table' | 'card') || 'table'
  );

  protected toggleViewMode(mode: 'table' | 'card'): void {
    this.viewMode.set(mode);
    localStorage.setItem('management_inventory_view_mode', mode);
  }

  protected getOutOfStockPercentage(): number {
    const total = this.store.stats().totalItems;
    if (total === 0) return 0;
    return Math.round((this.store.stats().outOfStockCount / total) * 100);
  }

  protected getLowStockPercentage(): number {
    const total = this.store.stats().totalItems;
    if (total === 0) return 0;
    return Math.round((this.store.stats().lowStockCount / total) * 100);
  }

  protected getFaultyVariantsPercentage(): number {
    const total = this.store.stats().totalItems;
    if (total === 0) return 0;
    return Math.round((this.store.stats().totalFaultyVariants / total) * 100);
  }

  protected getHighFaultyAlertPercentage(): number {
    const total = this.store.stats().totalItems;
    if (total === 0) return 0;
    return Math.round((this.store.stats().highFaultyAlertCount / total) * 100);
  }

  protected getImportPercentage(): number {
    const totalImports = this.store.logsStats().totalImports;
    const totalExports = this.store.logsStats().totalExports;
    const totalVolume = totalImports + totalExports;
    if (totalVolume === 0) return 0;
    return Math.round((totalImports / totalVolume) * 100);
  }

  protected getExportPercentage(): number {
    const totalImports = this.store.logsStats().totalImports;
    const totalExports = this.store.logsStats().totalExports;
    const totalVolume = totalImports + totalExports;
    if (totalVolume === 0) return 0;
    return Math.round((totalExports / totalVolume) * 100);
  }

  protected readonly stockStatusOptions = [
    { label: 'Tất cả trạng thái', value: StockStatusOption.ALL },
    { label: 'Còn hàng (>= 10)', value: StockStatusOption.IN_STOCK },
    { label: 'Sắp hết hàng (< 10)', value: StockStatusOption.LOW_STOCK },
    { label: 'Hết hàng (<= 0)', value: StockStatusOption.OUT_OF_STOCK },
  ];

  protected readonly sortOptions = [
    { label: 'Tên sản phẩm (A-Z)', value: 'productName,asc' },
    { label: 'Tên sản phẩm (Z-A)', value: 'productName,desc' },
    { label: 'Tồn kho (Giảm dần)', value: 'stockQuantity,desc' },
    { label: 'Tồn kho (Tăng dần)', value: 'stockQuantity,asc' },
  ];

  protected readonly transactionTypeOptions = [
    { label: 'Tất cả giao dịch', value: TransactionTypeFilterOption.ALL },
    { label: 'Chỉ Nhập kho', value: TransactionTypeFilterOption.IMPORT },
    { label: 'Chỉ Xuất kho', value: TransactionTypeFilterOption.EXPORT },
  ];

  protected readonly dateFilterOptions = [
    { label: 'Tất cả thời gian', value: InventoryDateFilterOption.ALL },
    { label: 'Hôm nay', value: InventoryDateFilterOption.TODAY },
    { label: '7 ngày qua', value: InventoryDateFilterOption.LAST_7_DAYS },
    { label: 'Tháng này', value: InventoryDateFilterOption.THIS_MONTH },
    { label: 'Tháng trước', value: InventoryDateFilterOption.LAST_MONTH },
    { label: 'Tùy chọn ngày', value: InventoryDateFilterOption.CUSTOM },
  ];

  protected readonly reasonFilterOptions = [
    { label: 'Tất cả lý do', value: 'all' },
    { label: 'Nhập hàng mới', value: InventoryTransactionReason.NEW_STOCK },
    { label: 'Điều chỉnh tăng', value: InventoryTransactionReason.ADJUSTMENT_ADD },
    { label: 'Khách hàng đặt mua', value: InventoryTransactionReason.CUSTOMER_ORDER },
    { label: 'Xuất hủy hàng hỏng', value: InventoryTransactionReason.DAMAGED },
    { label: 'Điều chỉnh giảm', value: InventoryTransactionReason.ADJUSTMENT_SUB },
    { label: 'Khách trả hàng', value: InventoryTransactionReason.RETURN },
  ];

  // Search input binding
  protected searchVal = signal<string>('');
  protected selectedDateFilter = signal<InventoryDateFilterOption>(InventoryDateFilterOption.ALL);
  protected customStartDate = signal<Date | null>(null);
  protected customEndDate = signal<Date | null>(null);
  protected printDate = new Date();

  // Re-export options for template binding
  protected readonly StockStatusOption = StockStatusOption;
  protected readonly TransactionTypeFilterOption = TransactionTypeFilterOption;
  protected readonly InventoryTransactionType = InventoryTransactionType;
  protected readonly InventoryTransactionReason = InventoryTransactionReason;
  protected readonly InventoryDateFilterOption = InventoryDateFilterOption;

  get staffOptions(): InventoryStaffFilterOption[] {
    const staff = this.store.activeStaffList();
    return [
      { label: 'Tất cả nhân viên', value: '', email: 'Không giới hạn người thực hiện', avatarUrl: null },
      ...staff.map((emp) => ({
        label: emp.fullName,
        value: emp.accountId,
        email: emp.email,
        avatarUrl: emp.imageUrl,
      })),
    ];
  }

  constructor() {
    // Load initial inventory and stats
    this.store.loadInventory();
    this.store.loadActiveStaff();

    // Side effects for success/error feedback toasts
    effect(() => {
      const success = this.store.successMessage();
      if (success) {
        untracked(() => {
          this.toastService.success(success);
          this.store.clearMessages();
        });
      }
    });

    effect(() => {
      const error = this.store.errorMessage();
      if (error) {
        untracked(() => {
          this.toastService.error(error);
          this.store.clearMessages();
        });
      }
    });
  }

  protected getPageSlots(): number[] {
    const total = this.store.totalPages();
    const current = this.store.currentPage();
    const slots: number[] = [];
    
    if (total <= 5) {
      for (let i = 0; i < total; i++) slots.push(i);
    } else {
      if (current <= 2) {
        slots.push(0, 1, 2, 3, total - 1);
      } else if (current >= total - 3) {
        slots.push(0, current - 1, total - 3, total - 2, total - 1);
      } else {
        slots.push(0, current - 1, current, current + 1, total - 1);
      }
    }
    return slots;
  }

  protected handleSearch(keyword: string): void {
    this.searchVal.set(keyword);
    this.store.setKeyword(keyword);
  }

  protected clearSearch(): void {
    this.searchVal.set('');
    this.store.setKeyword('');
  }

  protected setTab(tab: 'stock' | 'logs' | 'faulty'): void {
    this.clearSearch();
    this.store.setTab(tab);
  }

  protected handleDateFilterChange(option: InventoryDateFilterOption): void {
    this.selectedDateFilter.set(option);
    if (option === InventoryDateFilterOption.CUSTOM) {
      this.applyCustomDateFilter();
      return;
    }

    let startDate: string | null = null;
    let endDate: string | null = null;
    const now = new Date();

    if (option === InventoryDateFilterOption.TODAY) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      startDate = start.toISOString();
      endDate = end.toISOString();
    } else if (option === InventoryDateFilterOption.LAST_7_DAYS) {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = start.toISOString();
      endDate = now.toISOString();
    } else if (option === InventoryDateFilterOption.THIS_MONTH) {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      startDate = start.toISOString();
      endDate = now.toISOString();
    } else if (option === InventoryDateFilterOption.LAST_MONTH) {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      startDate = start.toISOString();
      endDate = end.toISOString();
    }

    this.store.setDateFilter(startDate, endDate);
  }

  protected handleCustomStartDateChange(value: Date | null): void {
    this.customStartDate.set(value);
    this.selectedDateFilter.set(InventoryDateFilterOption.CUSTOM);
    this.applyCustomDateFilter();
  }

  protected handleCustomEndDateChange(value: Date | null): void {
    this.customEndDate.set(value);
    this.selectedDateFilter.set(InventoryDateFilterOption.CUSTOM);
    this.applyCustomDateFilter();
  }

  private applyCustomDateFilter(): void {
    const startValue = this.customStartDate();
    const endValue = this.customEndDate();
    
    let startDate: string | null = null;
    if (startValue) {
      const d = new Date(startValue);
      d.setHours(0, 0, 0, 0);
      startDate = d.toISOString();
    }
    
    let endDate: string | null = null;
    if (endValue) {
      const d = new Date(endValue);
      d.setHours(23, 59, 59, 999);
      endDate = d.toISOString();
    }
    
    this.store.setDateFilter(startDate, endDate);
  }

  protected exportExcel(): void {
    if (this.store.activeTab() === 'stock' || this.store.activeTab() === 'faulty') {
      this.exportStockExcel();
      return;
    }
    this.exportLogsExcel();
  }

  private exportLogsExcel(): void {
    const logs = this.store.logs();
    if (!logs || logs.length === 0) {
      this.toastService.error('Không có dữ liệu nhật ký để xuất.');
      return;
    }

    const printedAt = this.formatDate(new Date().toISOString());
    const summaryRows = `
      <tr>
        <td class="summary-label">Tổng lượng nhập</td>
        <td class="summary-import">+${this.store.logsStats().totalImports}</td>
        <td class="summary-label">Tổng lượng xuất</td>
        <td class="summary-export">-${this.store.logsStats().totalExports}</td>
        <td class="summary-label">Tổng giao dịch</td>
        <td class="summary-count">${this.store.logsStats().totalCount}</td>
      </tr>
    `;

    const bodyRows = logs
      .map((log, index) => {
        const typeLabel = this.getTxTypeLabel(log.type);
        const quantityLabel = `${log.type === InventoryTransactionType.IMPORT ? '+' : '-'}${log.quantity}`;
        const quantityClass = log.type === InventoryTransactionType.IMPORT ? 'qty-import' : 'qty-export';
        const typeClass = log.type === InventoryTransactionType.IMPORT ? 'type-import' : 'type-export';
        const staffName = log.createdByName || 'Hệ thống';
        const staffEmail = log.createdByEmail || '---';

        return `
          <tr>
            <td class="cell-center">${index + 1}</td>
            <td class="cell-date">${this.escapeHtml(this.formatDate(log.createdAt))}</td>
            <td class="cell-product">${this.escapeHtml(log.productName)}</td>
            <td>${this.escapeHtml(log.variantName || 'Mặc định')}</td>
            <td class="cell-center ${typeClass}">${this.escapeHtml(typeLabel)}</td>
            <td class="cell-center ${quantityClass}">${this.escapeHtml(quantityLabel)}</td>
            <td>${this.escapeHtml(this.getTxReasonLabel(log.reason))}</td>
            <td>${this.escapeHtml(staffName)}</td>
            <td>${this.escapeHtml(staffEmail)}</td>
            <td>${this.escapeHtml(log.note || '---')}</td>
          </tr>
        `;
      })
      .join('');

    const workbookHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8" />
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Nhật ký kho</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body { font-family: Inter, Arial, sans-serif; color: #111827; }
            table { border-collapse: collapse; width: 100%; }
            .report-title { font-size: 20px; font-weight: 800; color: #111827; text-align: center; background: #FFC700; }
            .report-subtitle { font-size: 12px; color: #374151; text-align: center; background: #FFF7CC; }
            .summary-table td { border: 1px solid #E5E7EB; padding: 8px 10px; font-size: 12px; }
            .summary-label { background: #F9FAFB; font-weight: 700; color: #374151; }
            .summary-import { color: #16A34A; font-weight: 800; text-align: center; }
            .summary-export { color: #E11D48; font-weight: 800; text-align: center; }
            .summary-count { color: #4F46E5; font-weight: 800; text-align: center; }
            .data-table th { background: #101010; color: #FFFFFF; font-size: 12px; font-weight: 700; border: 1px solid #374151; padding: 10px 8px; text-align: center; }
            .data-table td { border: 1px solid #E5E7EB; padding: 8px 10px; font-size: 12px; vertical-align: middle; }
            .cell-center { text-align: center; }
            .cell-date { color: #374151; white-space: nowrap; }
            .cell-product { font-weight: 700; color: #111827; }
            .type-import { background: #F0FDF4; color: #16A34A; font-weight: 700; }
            .type-export { background: #FFF1F2; color: #E11D48; font-weight: 700; }
            .qty-import { color: #16A34A; font-weight: 800; }
            .qty-export { color: #E11D48; font-weight: 800; }
          </style>
        </head>
        <body>
          <table>
            <tr><td class="report-title" colspan="10">BÁO CÁO NHẬT KÝ NHẬP XUẤT KHO</td></tr>
            <tr><td class="report-subtitle" colspan="10">ZenTech Gaming Gear · Thời gian xuất: ${this.escapeHtml(printedAt)}</td></tr>
            <tr><td colspan="10"></td></tr>
          </table>
          <table class="summary-table">
            ${summaryRows}
          </table>
          <br />
          <table class="data-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Thời gian</th>
                <th>Sản phẩm</th>
                <th>Biến thể</th>
                <th>Giao dịch</th>
                <th>Số lượng</th>
                <th>Lý do</th>
                <th>Người thực hiện</th>
                <th>Email</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>
    `;

    this.downloadExcelWorkbook(workbookHtml, `bao-cao-nhat-ky-kho-${new Date().toISOString().slice(0, 10)}.xls`);
    this.toastService.success('Xuất file Excel nhật ký thành công!');
  }

  private exportStockExcel(): void {
    const stockItems = this.store.stockItems();
    if (!stockItems || stockItems.length === 0) {
      this.toastService.error('Không có dữ liệu tồn kho để xuất.');
      return;
    }

    const printedAt = this.formatDate(new Date().toISOString());
    const bodyRows = stockItems
      .map((item, index) => {
        const statusLabel = this.getStatusLabel(item.stockQuantity);
        const statusClass = this.getStockStatusClass(item.stockQuantity);
        const salePrice = item.salePrice ?? item.originalPrice;
        const inventoryValue = salePrice * item.stockQuantity;

        return `
          <tr>
            <td class="cell-center">${index + 1}</td>
            <td class="cell-product">${this.escapeHtml(item.productName)}</td>
            <td>${this.escapeHtml(item.variantName || 'Mặc định')}</td>
            <td class="cell-center">${this.escapeHtml(item.colorCode || '---')}</td>
            <td class="cell-number">${this.formatMoney(item.originalPrice)}</td>
            <td class="cell-number">${item.salePrice ? this.formatMoney(item.salePrice) : '---'}</td>
            <td class="cell-center stock-qty">${item.stockQuantity}</td>
            <td class="cell-center faulty-qty">${item.faultyQuantity || 0}</td>
            <td class="cell-center ${statusClass}">${this.escapeHtml(statusLabel)}</td>
            <td class="cell-number inventory-value">${this.formatMoney(inventoryValue)}</td>
          </tr>
        `;
      })
      .join('');

    const workbookHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Inter, Arial, sans-serif; color: #111827; }
            table { border-collapse: collapse; width: 100%; }
            .report-title { font-size: 20px; font-weight: 800; color: #111827; text-align: center; background: #FFC700; }
            .report-subtitle { font-size: 12px; color: #374151; text-align: center; background: #FFF7CC; }
            .summary-table td { border: 1px solid #E5E7EB; padding: 8px 10px; font-size: 12px; }
            .summary-label { background: #F9FAFB; font-weight: 700; color: #374151; }
            .summary-count { color: #4F46E5; font-weight: 800; text-align: center; }
            .summary-warning { color: #E11D48; font-weight: 800; text-align: center; }
            .data-table th { background: #101010; color: #FFFFFF; font-size: 12px; font-weight: 700; border: 1px solid #374151; padding: 10px 8px; text-align: center; }
            .data-table td { border: 1px solid #E5E7EB; padding: 8px 10px; font-size: 12px; vertical-align: middle; }
            .cell-center { text-align: center; }
            .cell-number { text-align: right; }
            .cell-product { font-weight: 700; color: #111827; }
            .stock-qty { font-weight: 800; color: #4F46E5; }
            .faulty-qty { font-weight: 800; color: #E11D48; }
            .inventory-value { font-weight: 800; color: #111827; }
            .status-in-stock { background: #F0FDF4; color: #16A34A; font-weight: 700; }
            .status-low-stock { background: #FFF7CC; color: #92400E; font-weight: 700; }
            .status-out-of-stock { background: #FFF1F2; color: #E11D48; font-weight: 700; }
          </style>
        </head>
        <body>
          <table>
            <tr><td class="report-title" colspan="10">BÁO CÁO TỒN KHO HIỆN TẠI</td></tr>
            <tr><td class="report-subtitle" colspan="10">ZenTech Gaming Gear · Thời gian xuất: ${this.escapeHtml(printedAt)}</td></tr>
            <tr><td colspan="10"></td></tr>
          </table>
          <table class="summary-table">
            <tr>
              <td class="summary-label">Tổng mặt hàng</td>
              <td class="summary-count">${this.store.stats().totalItems}</td>
              <td class="summary-label">Sắp hết hàng</td>
              <td class="summary-warning">${this.store.stats().lowStockCount}</td>
              <td class="summary-label">Hết hàng</td>
              <td class="summary-warning">${this.store.stats().outOfStockCount}</td>
            </tr>
          </table>
          <br />
          <table class="data-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Sản phẩm</th>
                <th>Biến thể</th>
                <th>Màu</th>
                <th>Giá gốc</th>
                <th>Giá bán</th>
                <th>Tồn kho</th>
                <th>Hàng lỗi/hỏng</th>
                <th>Trạng thái</th>
                <th>Giá trị tồn</th>
              </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>
    `;

    this.downloadExcelWorkbook(workbookHtml, `bao-cao-ton-kho-hien-tai-${new Date().toISOString().slice(0, 10)}.xls`);
    this.toastService.success('Xuất file Excel tồn kho thành công!');
  }

  private downloadExcelWorkbook(workbookHtml: string, fileName: string): void {
    const excelContent = `\uFEFF${workbookHtml}`;
    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch {
      return dateStr;
    }
  }

  protected exportPdf(): void {
    const isStockTab = this.store.activeTab() === 'stock' || this.store.activeTab() === 'faulty';
    const stockItems = this.store.stockItems();
    const logs = this.store.logs();

    if (isStockTab && (!stockItems || stockItems.length === 0)) {
      this.toastService.error('Không có dữ liệu tồn kho để in.');
      return;
    }

    if (!isStockTab && (!logs || logs.length === 0)) {
      this.toastService.error('Không có dữ liệu nhật ký để in.');
      return;
    }

    this.printDate = new Date();
    const reportHtml = isStockTab ? this.buildStockPrintHtml() : this.buildLogsPrintHtml();
    const printWindow = window.open('', '_blank', 'width=1200,height=800');

    if (!printWindow) {
      this.toastService.error('Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép popup và thử lại.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  }

  private buildLogsPrintHtml(): string {
    const printedAt = this.formatDate(this.printDate.toISOString());
    const rows = this.store.logs()
      .map((log, index) => {
        const badgeClass = log.type === InventoryTransactionType.IMPORT ? 'badge-import' : 'badge-export';
        const quantityClass = log.type === InventoryTransactionType.IMPORT ? 'qty-import' : 'qty-export';
        const quantityLabel = `${log.type === InventoryTransactionType.IMPORT ? '+' : '-'}${log.quantity}`;

        return `
          <tr>
            <td class="center index">${index + 1}</td>
            <td class="date">${this.escapeHtml(this.formatDate(log.createdAt))}</td>
            <td>
              <strong>${this.escapeHtml(log.productName)}</strong>
              <small>${this.escapeHtml(log.variantName || 'Mặc định')}</small>
            </td>
            <td class="center"><span class="badge ${badgeClass}">${this.escapeHtml(this.getTxTypeLabel(log.type))}</span></td>
            <td class="center ${quantityClass}">${this.escapeHtml(quantityLabel)}</td>
            <td>${this.escapeHtml(this.getTxReasonLabel(log.reason))}</td>
            <td>${this.escapeHtml(log.createdByName || 'Hệ thống')}</td>
            <td class="date">${this.escapeHtml(log.createdByEmail || '---')}</td>
          </tr>
        `;
      })
      .join('');

    return this.buildPrintDocument({
      code: 'B02-KHO',
      title: 'BÁO CÁO NHẬT KÝ NHẬP XUẤT KHO',
      printedAt,
      summaryHtml: `
        <div class="summary-card summary-import"><span>Tổng lượng nhập</span><strong>+${this.store.logsStats().totalImports}</strong></div>
        <div class="summary-card summary-export"><span>Tổng lượng xuất</span><strong>-${this.store.logsStats().totalExports}</strong></div>
        <div class="summary-card summary-count"><span>Tổng giao dịch</span><strong>${this.store.logsStats().totalCount}</strong></div>
      `,
      tableHeaderHtml: `
        <tr>
          <th>STT</th><th>Thời gian</th><th>Sản phẩm & Biến thể</th><th>Giao dịch</th>
          <th>SL</th><th>Lý do</th><th>Người thực hiện</th><th>Email</th>
        </tr>
      `,
      tableBodyHtml: rows,
      footerNote: 'Báo cáo được tạo tự động từ hệ thống quản lý kho ZenTech.',
    });
  }

  private buildStockPrintHtml(): string {
    const printedAt = this.formatDate(this.printDate.toISOString());
    const rows = this.store.stockItems()
      .map((item, index) => {
        const statusClass = this.getStockStatusClass(item.stockQuantity);
        const salePrice = item.salePrice ?? item.originalPrice;
        const inventoryValue = salePrice * item.stockQuantity;

        return `
          <tr>
            <td class="center index">${index + 1}</td>
            <td>
              <strong>${this.escapeHtml(item.productName)}</strong>
              <small>${this.escapeHtml(item.variantName || 'Mặc định')}</small>
            </td>
            <td class="center">${this.escapeHtml(item.colorCode || '---')}</td>
            <td class="money">${this.escapeHtml(this.formatMoney(item.originalPrice))}</td>
            <td class="money">${this.escapeHtml(this.formatMoney(salePrice))}</td>
            <td class="center qty-count">${item.stockQuantity}</td>
            <td class="center"><span class="badge ${statusClass}">${this.escapeHtml(this.getStatusLabel(item.stockQuantity))}</span></td>
            <td class="money inventory-value">${this.escapeHtml(this.formatMoney(inventoryValue))}</td>
          </tr>
        `;
      })
      .join('');

    return this.buildPrintDocument({
      code: 'B01-TK',
      title: 'BÁO CÁO TỒN KHO HIỆN TẠI',
      printedAt,
      summaryHtml: `
        <div class="summary-card summary-count"><span>Tổng mặt hàng</span><strong>${this.store.stats().totalItems}</strong></div>
        <div class="summary-card summary-export"><span>Sắp hết hàng</span><strong>${this.store.stats().lowStockCount}</strong></div>
        <div class="summary-card summary-export"><span>Hết hàng</span><strong>${this.store.stats().outOfStockCount}</strong></div>
      `,
      tableHeaderHtml: `
        <tr>
          <th>STT</th><th>Sản phẩm & Biến thể</th><th>Màu</th><th>Giá gốc</th>
          <th>Giá bán</th><th>Tồn kho</th><th>Trạng thái</th><th>Giá trị tồn</th>
        </tr>
      `,
      tableBodyHtml: rows,
      footerNote: 'Báo cáo chỉ phản ánh dữ liệu tồn kho đang hiển thị theo bộ lọc hiện tại.',
    });
  }

  private buildPrintDocument(config: {
    code: string;
    title: string;
    printedAt: string;
    summaryHtml: string;
    tableHeaderHtml: string;
    tableBodyHtml: string;
    footerNote: string;
  }): string {
    return `
      <!doctype html>
      <html lang="vi">
        <head>
          <meta charset="utf-8" />
          <title>${this.escapeHtml(config.title)}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Inter, Arial, sans-serif; color: #111827; background: #FFFFFF; }
            .report { width: 100%; }
            .brand { display: grid; grid-template-columns: 52px 1fr auto; align-items: center; gap: 14px; padding: 14px 18px; background: #101010; color: #FFFFFF; border-radius: 12px; }
            .brand-logo { display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 999px; background: #FFC700; color: #111827; font-weight: 900; }
            .brand h2 { margin: 0; font-size: 15px; letter-spacing: 0.08em; }
            .brand p { margin: 4px 0 0; font-size: 10px; color: #D1D5DB; }
            .meta { text-align: right; font-size: 10px; line-height: 1.7; }
            .title { margin: 18px 0 14px; text-align: center; }
            .title span { display: inline-block; padding: 4px 12px; border-radius: 999px; background: #FFF7CC; font-size: 9px; font-weight: 800; letter-spacing: 0.14em; }
            .title h1 { margin: 7px 0 0; font-size: 20px; font-weight: 900; }
            .title p { margin: 6px 0 0; color: #6B7280; font-size: 10px; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
            .summary-card { padding: 10px 12px; border: 1px solid #E5E7EB; border-radius: 12px; background: #F9FAFB; }
            .summary-card span { display: block; color: #6B7280; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
            .summary-card strong { display: block; margin-top: 4px; font-size: 18px; font-weight: 900; }
            .summary-import strong, .qty-import { color: #16A34A; }
            .summary-export strong, .qty-export { color: #E11D48; }
            .summary-count strong, .qty-count, .inventory-value, .index { color: #4F46E5; }
            table { width: 100%; border-collapse: collapse; border: 1px solid #E5E7EB; }
            th { background: #101010; color: #FFFFFF; padding: 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; }
            td { border: 1px solid #E5E7EB; padding: 7px 8px; font-size: 9px; vertical-align: middle; }
            tr:nth-child(even) td { background: #F9FAFB; }
            strong { display: block; font-size: 9px; color: #111827; }
            small { display: block; margin-top: 2px; color: #6B7280; font-size: 8px; }
            .center { text-align: center; }
            .money { text-align: right; white-space: nowrap; }
            .date { white-space: nowrap; color: #4B5563; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 8px; font-weight: 800; white-space: nowrap; }
            .badge-import, .status-in-stock { background: #F0FDF4; color: #16A34A; }
            .badge-export, .status-out-of-stock { background: #FFF1F2; color: #E11D48; }
            .status-low-stock { background: #FFF7CC; color: #92400E; }
            .note { margin-top: 10px; padding: 10px 12px; border-left: 4px solid #FFC700; background: #FFF7CC; border-radius: 8px; color: #374151; font-size: 9px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 28px; padding: 0 90px; page-break-inside: avoid; }
            .signature { width: 220px; text-align: center; }
            .signature-title { margin: 0; font-size: 11px; font-weight: 800; }
            .signature-line { width: 160px; height: 46px; margin: 0 auto 6px; border-bottom: 1px solid #9CA3AF; }
            .signature-hint { margin: 0; font-size: 9px; color: #6B7280; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <main class="report">
            <section class="brand">
              <div class="brand-logo">ZT</div>
              <div><h2>ZENTECH GAMING GEAR</h2><p>Hệ thống bán lẻ thiết bị công nghệ cao cấp</p></div>
              <div class="meta"><div><strong>Mẫu số:</strong> ${this.escapeHtml(config.code)}</div><div><strong>Ngày in:</strong> ${this.escapeHtml(config.printedAt)}</div></div>
            </section>
            <section class="title"><span>BÁO CÁO QUẢN TRỊ KHO</span><h1>${this.escapeHtml(config.title)}</h1><p>Thời gian lập báo cáo: ${this.escapeHtml(config.printedAt)}</p></section>
            <section class="summary">${config.summaryHtml}</section>
            <table><thead>${config.tableHeaderHtml}</thead><tbody>${config.tableBodyHtml}</tbody></table>
            <section class="note">${this.escapeHtml(config.footerNote)}</section>
            <section class="signatures">
              <div class="signature"><p class="signature-title">Người lập biểu</p><div class="signature-line"></div><p class="signature-hint">Ký, ghi rõ họ tên</p></div>
              <div class="signature"><p class="signature-title">Thủ kho</p><div class="signature-line"></div><p class="signature-hint">Ký, ghi rõ họ tên</p></div>
            </section>
          </main>
        </body>
      </html>
    `;
  }

  protected getStatusLabel(status: number): string {
    if (status <= 0) return 'Hết hàng';
    if (status < 10) return 'Sắp hết hàng';
    return 'Còn hàng';
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private getStockStatusClass(status: number): string {
    if (status <= 0) return 'status-out-of-stock';
    if (status < 10) return 'status-low-stock';
    return 'status-in-stock';
  }

  protected getPrintStockStatusClass(status: number): string {
    if (status <= 0) return 'print-badge print-badge--export';
    if (status < 10) return 'print-badge print-badge--low';
    return 'print-badge print-badge--import';
  }

  protected getStatusClass(status: number): string {
    if (status <= 0) return 'status-badge--out';
    if (status < 10) return 'status-badge--low';
    return 'status-badge--in';
  }

  protected getTxTypeLabel(type: InventoryTransactionType): string {
    return type === InventoryTransactionType.IMPORT ? 'Nhập kho' : 'Xuất kho';
  }

  protected getTxReasonLabel(reason: InventoryTransactionReason): string {
    switch (reason) {
      case InventoryTransactionReason.NEW_STOCK:
        return 'Nhập hàng mới';
      case InventoryTransactionReason.ADJUSTMENT_ADD:
        return 'Điều chỉnh tăng';
      case InventoryTransactionReason.CUSTOMER_ORDER:
        return 'Khách hàng đặt mua';
      case InventoryTransactionReason.DAMAGED:
        return 'Xuất hủy hàng hỏng';
      case InventoryTransactionReason.ADJUSTMENT_SUB:
        return 'Điều chỉnh giảm';
      case InventoryTransactionReason.RETURN:
        return 'Khách trả hàng';
      default:
        return 'Lý do khác';
    }
  }

  protected getTxReasonClass(reason: InventoryTransactionReason): string {
    switch (reason) {
      case InventoryTransactionReason.CUSTOMER_ORDER:
        return 'reason-badge--order';
      case InventoryTransactionReason.DAMAGED:
        return 'reason-badge--damaged';
      case InventoryTransactionReason.NEW_STOCK:
        return 'reason-badge--import';
      case InventoryTransactionReason.RETURN:
        return 'reason-badge--return';
      default:
        return 'reason-badge--adj';
    }
  }

  protected openAdjust(item: InventorySummary): void {
    this.store.openAdjustDialog(item);
  }

  protected onAdjustSubmit(payload: InventoryAdjustmentRequest): void {
    this.store.adjustStock(payload);
  }

  protected closeDialog(): void {
    this.store.closeDialog();
  }

  protected openAiRecommend(): void {
    this.store.loadAiRecommendations();
  }

  protected closeAiDialog(): void {
    this.store.closeAiDialog();
  }

  protected copyToClipboard(text: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.toastService.success('Đã sao chép ghi chú vào bộ nhớ tạm!');
      }).catch(() => {
        this.toastService.error('Không thể sao chép ghi chú.');
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        this.toastService.success('Đã sao chép ghi chú vào bộ nhớ tạm!');
      } catch (err) {
        this.toastService.error('Không thể sao chép ghi chú.');
      }
      document.body.removeChild(textarea);
    }
  }

  protected handlePageChange(event: PaginatorState): void {
    if (event.page !== undefined) {
      this.store.goToPage(event.page);
    }
  }
}
