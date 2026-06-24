import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ChartModule } from 'primeng/chart';
import { DatePicker } from 'primeng/datepicker';
import {
  LucideChartBar,
  LucideDownload,
  LucideUsers,
  LucideShoppingCart,
  LucideCreditCard,
  LucideLayers,
  LucideCheck,
  LucidePackage,
  LucideBot,
  LucideCalendar,
  LucideAlertTriangle,
} from '@lucide/angular';
import { ReportsStore } from '../../data-access/store/reports.store';
import { ReportPeriod, ReportsTab, IProductReport, ICustomerSegment } from '../../data-access/models/reports.model';
import { ReportsEvent } from '../../data-access/models/reports.event';

interface ChartTooltipContext {
  dataset: {
    label?: string;
  };
  parsed: {
    y: number | null;
  };
}

interface ChartDataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor?: string;
  borderDash?: number[];
  borderWidth?: number;
  tension: number;
  fill: boolean;
  pointRadius: number;
  pointHoverRadius: number;
  pointBackgroundColor?: string;
  pointBorderColor?: string;
  pointBorderWidth?: number;
  pointHitRadius?: number;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

@Component({
  selector: 'app-management-reports-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ChartModule,
    DatePicker,
    LucideChartBar,
    LucideDownload,
    LucideUsers,
    LucideShoppingCart,
    LucideCreditCard,
    LucideLayers,
    LucideCheck,
    LucidePackage,
    LucideBot,
    LucideCalendar,
    LucideAlertTriangle,
  ],
  providers: [ReportsStore],
  templateUrl: './management-reports.component.html',
  styleUrl: './management-reports.component.css',
})
export class ManagementReportsPageComponent implements OnInit {
  protected readonly store = inject(ReportsStore);
  protected readonly ReportsTab = ReportsTab;
  protected readonly ReportPeriod = ReportPeriod;
  private readonly sanitizer = inject(DomSanitizer);
  
  // 4 visual tabs: 'revenue' | 'products' | 'customers' | 'inventory'
  protected activeSubTab: 'revenue' | 'products' | 'customers' | 'inventory' = 'revenue';
  
  // Custom date selection
  protected customStartDate: Date | null = null;
  protected customEndDate: Date | null = null;
  protected showCustomDatePanel = false;
  
  // Drill-down dialog states
  protected showProductDetailsDialog = false;
  protected selectedProductDetails: IProductReport | null = null;
  
  protected showCustomerDetailsDialog = false;
  protected selectedCustomerDetails: ICustomerSegment | null = null;
  
  // Export Wizard states
  protected showExportWizardDialog = false;
  protected exportOptions = {
    summary: true,
    products: true,
    coupons: true,
    customers: true,
    aiAnalysis: true
  };
  
  // Interactive SVG chart tooltip
  protected hoveredPoint: { label: string; current: number; prev: number; diff: number; svgX: number; svgY: number } | null = null;
  protected tooltipX = 0;
  protected tooltipY = 0;

  protected readonly revenueChart = computed(() => this.getRevenueChartData());

  protected chartOptions = {
    maintainAspectRatio: false,
    aspectRatio: 0.6,
    animation: {
      duration: 900,
      easing: 'easeOutQuart'
    },
    plugins: {
      legend: {
        align: 'end',
        labels: {
          color: '#374151',
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          padding: 18,
          font: { family: 'Inter', size: 12, weight: '600' }
        },
        position: 'bottom'
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#101010',
        titleColor: '#FFC700',
        bodyColor: '#FFFFFF',
        borderColor: 'rgba(255, 199, 0, 0.35)',
        borderWidth: 1,
        padding: 14,
        boxPadding: 8,
        cornerRadius: 14,
        displayColors: true,
        titleFont: { family: 'Inter', size: 13, weight: '600' },
        bodyFont: { family: 'Inter', size: 12, weight: '500' },
        callbacks: {
          label: (context: ChartTooltipContext) => {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('vi-VN').format(context.parsed.y) + 'đ';
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#6B7280',
          maxRotation: 45,
          minRotation: 45,
          font: { family: 'Inter', size: 11, weight: '500' }
        },
        grid: { display: false },
        border: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: { 
          color: '#6B7280', 
          padding: 10,
          font: { family: 'Inter', size: 12, weight: '500' },
          callback: (value: number | string) => {
            const numericValue = Number(value);
            if (numericValue >= 1_000_000_000) return (numericValue / 1_000_000_000).toFixed(1).replace('.0', '') + ' Tỷ';
            if (numericValue >= 1_000_000) return (numericValue / 1_000_000).toFixed(0) + ' Tr';
            return numericValue;
          }
        },
        grid: {
          color: 'rgba(229, 231, 235, 0.72)',
          drawTicks: false
        },
        border: { display: false }
      }
    },
    elements: {
      line: { capBezierPoints: true }
    },
    interaction: { mode: 'index', intersect: false }
  };

  // Filter AI insights based on the active tab category
  protected readonly currentTabInsights = computed(() => {
    const all = this.store.insights();
    return all.filter(i => i.category === this.activeSubTab);
  });

  protected safeAiHtml = computed(() => {
    const raw = this.store.aiAnalysisResult();
    if (!raw) return null;
    const html = marked.parse(raw) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  protected triggerAiAnalysis() {
    this.store.dispatch({ type: ReportsEvent.AnalyzeClicked, payload: this.activeSubTab });
  }

  ngOnInit(): void {
    // Initialize date inputs to default 30 days range
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    this.customStartDate = thirtyDaysAgo;
    this.customEndDate = today;

    // Load initial reports data on mount
    this.store.loadAllReports(this.store.period());
  }

  private formatDateToYMD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  protected setSubTab(tab: 'revenue' | 'products' | 'customers' | 'inventory'): void {
    this.activeSubTab = tab;
    // Map visual tabs to store tabs for underlying data consistency
    if (tab === 'revenue') {
      this.store.setTab(ReportsTab.Revenue);
    } else if (tab === 'products') {
      this.store.setTab(ReportsTab.Products);
    } else if (tab === 'inventory') {
      this.store.setTab(ReportsTab.Inventory);
    } else {
      // For customers tab (or we can just reuse AIOps as a generic trigger if needed)
      this.store.setTab(ReportsTab.AIOps);
    }
  }

  protected selectPeriod(period: ReportPeriod): void {
    if (period === ReportPeriod.Custom) {
      this.showCustomDatePanel = true;
    } else {
      this.showCustomDatePanel = false;
      this.store.setPeriod(period);
    }
  }

  protected applyCustomDates(): void {
    if (!this.customStartDate || !this.customEndDate) return;
    this.showCustomDatePanel = false;

    // Normalize to start of customStartDate and end of customEndDate
    const start = new Date(this.customStartDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(this.customEndDate);
    end.setHours(23, 59, 59, 999);

    this.store.dispatch({ type: ReportsEvent.PeriodChanged, payload: ReportPeriod.Custom });
    this.store.loadAllReports({
      period: ReportPeriod.Custom,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
  }

  protected getAverageDailyRevenue(): number {
    const summary = this.store.summary();
    if (!summary) return 0;
    
    const period = this.store.period();
    if (period === ReportPeriod.Today) {
      return summary.totalRevenue;
    } else if (period === ReportPeriod.Last7Days) {
      return summary.totalRevenue / 7;
    } else if (period === ReportPeriod.Last30Days) {
      return summary.totalRevenue / 30;
    } else if (period === ReportPeriod.Custom) {
      if (this.customStartDate && this.customEndDate) {
        const start = new Date(this.customStartDate);
        const end = new Date(this.customEndDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        return summary.totalRevenue / diffDays;
      }
    }
    return summary.totalRevenue / 30;
  }

  protected getPeriodLabel(period: ReportPeriod): string {
    switch (period) {
      case ReportPeriod.Today:
        return 'Hôm nay';
      case ReportPeriod.Last7Days:
        return '7 ngày qua';
      case ReportPeriod.Last30Days:
        return '30 ngày qua';
      case ReportPeriod.Custom:
        return 'Tùy chọn khoảng ngày';
      default:
        return 'Mặc định';
    }
  }

  protected getRevenueChartData(): ChartData {
    const series = this.store.revenueSeries();
    if (series.length === 0) return { labels: [], datasets: [] };

    return {
      labels: series.map(s => s.label),
      datasets: [
        {
          label: 'Chu kỳ hiện tại',
          data: series.map(s => s.currentValue),
          borderColor: '#4F46E5',
          backgroundColor: 'rgba(79, 70, 229, 0.12)',
          borderWidth: 3,
          tension: 0.42,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 7,
          pointHitRadius: 12,
          pointBackgroundColor: '#FFC700',
          pointBorderColor: '#101010',
          pointBorderWidth: 2
        },
        {
          label: 'Chu kỳ trước đó',
          data: series.map(s => s.previousValue),
          borderColor: '#9CA3AF',
          borderDash: [7, 7],
          borderWidth: 2,
          tension: 0.42,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHitRadius: 10,
          pointBackgroundColor: '#FFFFFF',
          pointBorderColor: '#9CA3AF',
          pointBorderWidth: 2
        }
      ]
    };
  }

  // Detail Drill-down launchers
  protected openProductDetails(product: IProductReport): void {
    this.selectedProductDetails = product;
    this.showProductDetailsDialog = true;
  }

  protected openCustomerDetails(customer: ICustomerSegment): void {
    this.selectedCustomerDetails = customer;
    this.showCustomerDetailsDialog = true;
  }

  protected openExportWizard(): void {
    this.showExportWizardDialog = true;
  }

  private escapeXmlValue(val: string | number | boolean | null | undefined): string {
    if (val === null || val === undefined) {
      return '';
    }
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private cleanMarkdownForExcel(val: string): string {
    if (!val) return '';
    return val
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1')     // Remove italic
      .replace(/^#+\s/gm, '')          // Remove headings
      .replace(/^- /gm, '• ');         // Use bullet point for lists
  }

  // Premium Styled XML Spreadsheet 2003 Exporter (Excel high-fidelity styling)
  protected exportToCsv(): void {
    const summary = this.store.summary();
    if (!summary) return;

    this.showExportWizardDialog = false;

    // XML Header
    let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
    xml += `<?mso-application progid="Excel.Sheet"?>\n`;
    xml += `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n`;
    xml += ` xmlns:o="urn:schemas-microsoft-com:office:office"\n`;
    xml += ` xmlns:x="urn:schemas-microsoft-com:office:excel"\n`;
    xml += ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n`;
    xml += ` xmlns:html="http://www.w3.org/TR/REC-html40">\n`;
    
    xml += ` <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">\n`;
    xml += `  <Author>ZenTech System</Author>\n`;
    xml += `  <Created>${new Date().toISOString()}</Created>\n`;
    xml += ` </DocumentProperties>\n`;

    // Custom styles
    xml += ` <Styles>\n`;
    xml += `  <Style ss:ID="Default" ss:Name="Normal">\n`;
    xml += `   <Alignment ss:Vertical="Center"/>\n`;
    xml += `   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#111827"/>\n`;
    xml += `  </Style>\n`;
    
    xml += `  <Style ss:ID="BannerTitle">\n`;
    xml += `   <Font ss:FontName="Segoe UI" ss:Size="14" ss:Bold="1" ss:Color="#FFFFFF"/>\n`;
    xml += `   <Interior ss:Color="#101010" ss:Pattern="Solid"/>\n`;
    xml += `   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n`;
    xml += `  </Style>\n`;
    
    xml += `  <Style ss:ID="BannerSubtitle">\n`;
    xml += `   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#9CA3AF"/>\n`;
    xml += `   <Interior ss:Color="#101010" ss:Pattern="Solid"/>\n`;
    xml += `   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n`;
    xml += `  </Style>\n`;
    
    xml += `  <Style ss:ID="SectionHeader">\n`;
    xml += `   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#4F46E5"/>\n`;
    xml += `   <Interior ss:Color="#EEF2FF" ss:Pattern="Solid"/>\n`;
    xml += `   <Alignment ss:Vertical="Center" ss:Horizontal="Left"/>\n`;
    xml += `   <Borders>\n`;
    xml += `    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#4F46E5"/>\n`;
    xml += `   </Borders>\n`;
    xml += `  </Style>\n`;
    
    xml += `  <Style ss:ID="TableHeader">\n`;
    xml += `   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#374151"/>\n`;
    xml += `   <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>\n`;
    xml += `   <Borders>\n`;
    xml += `    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `   </Borders>\n`;
    xml += `   <Alignment ss:Vertical="Center" ss:Horizontal="Left"/>\n`;
    xml += `  </Style>\n`;
    
    xml += `  <Style ss:ID="TableHeaderRight">\n`;
    xml += `   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#374151"/>\n`;
    xml += `   <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>\n`;
    xml += `   <Borders>\n`;
    xml += `    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `   </Borders>\n`;
    xml += `   <Alignment ss:Vertical="Center" ss:Horizontal="Right"/>\n`;
    xml += `  </Style>\n`;
    
    xml += `  <Style ss:ID="TableCell">\n`;
    xml += `   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1F2937"/>\n`;
    xml += `   <Borders>\n`;
    xml += `    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `   </Borders>\n`;
    xml += `   <Alignment ss:Vertical="Center" ss:Horizontal="Left"/>\n`;
    xml += `  </Style>\n`;
    
    xml += `  <Style ss:ID="TableCellRight">\n`;
    xml += `   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1F2937"/>\n`;
    xml += `   <Borders>\n`;
    xml += `    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `   </Borders>\n`;
    xml += `   <Alignment ss:Vertical="Center" ss:Horizontal="Right"/>\n`;
    xml += `  </Style>\n`;

    xml += `  <Style ss:ID="TableCellCenter">\n`;
    xml += `   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1F2937"/>\n`;
    xml += `   <Borders>\n`;
    xml += `    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `   </Borders>\n`;
    xml += `   <Alignment ss:Vertical="Center" ss:Horizontal="Center"/>\n`;
    xml += `  </Style>\n`;
    
    xml += `  <Style ss:ID="TotalRow">\n`;
    xml += `   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#111827"/>\n`;
    xml += `   <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>\n`;
    xml += `   <Borders>\n`;
    xml += `    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>\n`;
    xml += `    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#111827"/>\n`;
    xml += `   </Borders>\n`;
    xml += `   <Alignment ss:Vertical="Center" ss:Horizontal="Left"/>\n`;
    xml += `  </Style>\n`;
    
    xml += `  <Style ss:ID="AiCell">\n`;
    xml += `   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1F2937"/>\n`;
    xml += `   <Interior ss:Color="#F0FDF4" ss:Pattern="Solid"/>\n`;
    xml += `   <Borders>\n`;
    xml += `    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#16A34A"/>\n`;
    xml += `    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#16A34A"/>\n`;
    xml += `    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#16A34A"/>\n`;
    xml += `    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#16A34A"/>\n`;
    xml += `   </Borders>\n`;
    xml += `   <Alignment ss:Vertical="Top" ss:Horizontal="Left" ss:WrapText="1"/>\n`;
    xml += `  </Style>\n`;
    
    xml += `  <Style ss:ID="TotalRowRight">\n`;
    xml += `   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#111827"/>\n`;
    xml += `   <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>\n`;
    xml += `   <Borders>\n`;
    xml += `    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>\n`;
    xml += `    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#111827"/>\n`;
    xml += `   </Borders>\n`;
    xml += `   <Alignment ss:Vertical="Center" ss:Horizontal="Right"/>\n`;
    xml += `  </Style>\n`;
    
    xml += `  <Style ss:ID="CurrencyCell">\n`;
    xml += `   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1F2937"/>\n`;
    xml += `   <Borders>\n`;
    xml += `    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `   </Borders>\n`;
    xml += `   <Alignment ss:Vertical="Center" ss:Horizontal="Right"/>\n`;
    xml += `   <NumberFormat ss:Format="#,##0"/>\n`;
    xml += `  </Style>\n`;

    xml += `  <Style ss:ID="CurrencyCellTotal">\n`;
    xml += `   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#111827"/>\n`;
    xml += `   <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>\n`;
    xml += `   <Borders>\n`;
    xml += `    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>\n`;
    xml += `    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#111827"/>\n`;
    xml += `   </Borders>\n`;
    xml += `   <Alignment ss:Vertical="Center" ss:Horizontal="Right"/>\n`;
    xml += `   <NumberFormat ss:Format="#,##0"/>\n`;
    xml += `  </Style>\n`;

    xml += `  <Style ss:ID="PercentCell">\n`;
    xml += `   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1F2937"/>\n`;
    xml += `   <Borders>\n`;
    xml += `    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `   </Borders>\n`;
    xml += `   <Alignment ss:Vertical="Center" ss:Horizontal="Right"/>\n`;
    xml += `   <NumberFormat ss:Format="0.0%"/>\n`;
    xml += `  </Style>\n`;
    
    xml += `  <Style ss:ID="BadgeGold">\n`;
    xml += `   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#B45309"/>\n`;
    xml += `   <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>\n`;
    xml += `   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n`;
    xml += `   <Borders>\n`;
    xml += `    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `   </Borders>\n`;
    xml += `  </Style>\n`;
    
    xml += `  <Style ss:ID="BadgeSilver">\n`;
    xml += `   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#374151"/>\n`;
    xml += `   <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>\n`;
    xml += `   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n`;
    xml += `   <Borders>\n`;
    xml += `    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n`;
    xml += `   </Borders>\n`;
    xml += `  </Style>\n`;
    xml += ` </Styles>\n`;

    // Worksheet & Table Config
    xml += ` <Worksheet ss:Name="Báo cáo Quản trị">\n`;
    xml += `  <Table>\n`;
    
    // Explicit column widths (Column A to E) to prevent ### overflow
    xml += `   <Column ss:Width="260"/>\n`; // A: Tên / Chỉ số
    xml += `   <Column ss:Width="160"/>\n`; // B: Giá trị / Biến thể
    xml += `   <Column ss:Width="120"/>\n`; // C: Đơn vị / Sản lượng
    xml += `   <Column ss:Width="160"/>\n`; // D: Doanh thu / Email
    xml += `   <Column ss:Width="140"/>\n`; // E: Tồn kho / Phân hạng
    
    // 1. Corporate Brand Banner Rows (Row 1-2 merged)
    xml += `   <Row ss:Height="28">\n`;
    xml += `    <Cell ss:MergeAcross="4" ss:StyleID="BannerTitle">\n`;
    xml += `     <Data ss:Type="String">ZENTECH - BÁO CÁO THỐNG KÊ HOẠT ĐỘNG KINH DOANH CHUYÊN SÂU</Data>\n`;
    xml += `    </Cell>\n`;
    xml += `   </Row>\n`;
    
    xml += `   <Row ss:Height="22">\n`;
    xml += `    <Cell ss:MergeAcross="4" ss:StyleID="BannerSubtitle">\n`;
    let subtitleStr = `Xuất ngày: ${new Date().toLocaleString()} | Chu kỳ: ${this.getPeriodLabel(this.store.period())}`;
    if (this.store.period() === ReportPeriod.Custom) {
      subtitleStr += ` | Khoảng thời gian: Từ ngày ${this.customStartDate} đến ngày ${this.customEndDate}`;
    }
    xml += `     <Data ss:Type="String">${this.escapeXmlValue(subtitleStr)}</Data>\n`;
    xml += `    </Cell>\n`;
    xml += `   </Row>\n`;
    
    xml += `   <Row ss:Height="15"/>\n`; // Spacing row

    // 2. Summary KPI section
    if (this.exportOptions.summary) {
      xml += `   <Row ss:Height="24">\n`;
      xml += `    <Cell ss:MergeAcross="2" ss:StyleID="SectionHeader">\n`;
      xml += `     <Data ss:Type="String">I. TỔNG QUAN CHỈ SỐ SỨC KHỎE TÀI CHÍNH &amp; BÁN LẺ</Data>\n`;
      xml += `    </Cell>\n`;
      xml += `   </Row>\n`;

      xml += `   <Row ss:Height="20">\n`;
      xml += `    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Chỉ số quản trị</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableHeaderRight"><Data ss:Type="String">Giá trị thực tế</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Đơn vị tính</Data></Cell>\n`;
      xml += `   </Row>\n`;

      // KPI Total Revenue
      xml += `   <Row ss:Height="20">\n`;
      xml += `    <Cell ss:StyleID="TableCell"><Data ss:Type="String">Tổng doanh thu bán lẻ thực tế</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="CurrencyCell"><Data ss:Type="Number">${summary.totalRevenue}</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableCell"><Data ss:Type="String">VNĐ</Data></Cell>\n`;
      xml += `   </Row>\n`;

      // KPI Daily Avg
      xml += `   <Row ss:Height="20">\n`;
      xml += `    <Cell ss:StyleID="TableCell"><Data ss:Type="String">Doanh thu trung bình mỗi ngày (Daily Avg)</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="CurrencyCell"><Data ss:Type="Number">${Math.round(this.getAverageDailyRevenue())}</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableCell"><Data ss:Type="String">VNĐ/ngày</Data></Cell>\n`;
      xml += `   </Row>\n`;

      // KPI Completed Orders
      xml += `   <Row ss:Height="20">\n`;
      xml += `    <Cell ss:StyleID="TableCell"><Data ss:Type="String">Tổng số đơn hàng hoàn tất</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableCellRight"><Data ss:Type="Number">${summary.totalOrders}</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableCell"><Data ss:Type="String">đơn hàng</Data></Cell>\n`;
      xml += `   </Row>\n`;

      // KPI AOV
      xml += `   <Row ss:Height="20">\n`;
      xml += `    <Cell ss:StyleID="TableCell"><Data ss:Type="String">Giá trị trung bình đơn hàng (AOV)</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="CurrencyCell"><Data ss:Type="Number">${summary.averageOrderValue}</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableCell"><Data ss:Type="String">VNĐ</Data></Cell>\n`;
      xml += `   </Row>\n`;

      // KPI autoFulfillmentRate
      xml += `   <Row ss:Height="20">\n`;
      xml += `    <Cell ss:StyleID="TableCell"><Data ss:Type="String">Tỷ lệ hoàn thành đơn hàng thành công</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="PercentCell"><Data ss:Type="Number">${summary.autoFulfillmentRate / 100}</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableCell"><Data ss:Type="String">%</Data></Cell>\n`;
      xml += `   </Row>\n`;

      // KPI growthRate
      xml += `   <Row ss:Height="20">\n`;
      xml += `    <Cell ss:StyleID="TableCell"><Data ss:Type="String">Tỷ lệ tăng trưởng doanh số kỳ trước</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="PercentCell"><Data ss:Type="Number">${summary.growthRate / 100}</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableCell"><Data ss:Type="String">%</Data></Cell>\n`;
      xml += `   </Row>\n`;

      xml += `   <Row ss:Height="15"/>\n`; // Spacer
    }

    // 3. Products
    if (this.exportOptions.products) {
      xml += `   <Row ss:Height="24">\n`;
      xml += `    <Cell ss:MergeAcross="4" ss:StyleID="SectionHeader">\n`;
      xml += `     <Data ss:Type="String">II. DANH SÁCH SẢN PHẨM BÁN CHẠY NHẤT (BEST SELLERS)</Data>\n`;
      xml += `    </Cell>\n`;
      xml += `   </Row>\n`;

      xml += `   <Row ss:Height="20">\n`;
      xml += `    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tên sản phẩm</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Biến thể</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableHeaderRight"><Data ss:Type="String">Số lượng đã bán</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableHeaderRight"><Data ss:Type="String">Doanh thu bán</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableHeaderRight"><Data ss:Type="String">Tồn kho hiện tại</Data></Cell>\n`;
      xml += `   </Row>\n`;

      let totalQty = 0;
      let totalRev = 0;
      this.store.products().forEach((p) => {
        xml += `   <Row ss:Height="20">\n`;
        xml += `    <Cell ss:StyleID="TableCell"><Data ss:Type="String">${this.escapeXmlValue(p.productName)}</Data></Cell>\n`;
        xml += `    <Cell ss:StyleID="TableCell"><Data ss:Type="String">${this.escapeXmlValue(p.variantName)}</Data></Cell>\n`;
        xml += `    <Cell ss:StyleID="TableCellRight"><Data ss:Type="String">${p.quantitySold} chiếc</Data></Cell>\n`;
        xml += `    <Cell ss:StyleID="CurrencyCell"><Data ss:Type="Number">${p.revenue}</Data></Cell>\n`;
        xml += `    <Cell ss:StyleID="TableCellRight"><Data ss:Type="String">${p.stockRemaining} chiếc</Data></Cell>\n`;
        xml += `   </Row>\n`;
        totalQty += p.quantitySold;
        totalRev += p.revenue;
      });

      xml += `   <Row ss:Height="22">\n`;
      xml += `    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">TỔNG CỘNG SẢN LƯỢNG &amp; DOANH THU</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TotalRow"><Data ss:Type="String"></Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TotalRowRight"><Data ss:Type="String">${totalQty} chiếc</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="CurrencyCellTotal"><Data ss:Type="Number">${totalRev}</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TotalRowRight"><Data ss:Type="String"></Data></Cell>\n`;
      xml += `   </Row>\n`;

      xml += `   <Row ss:Height="15"/>\n`; // Spacer
    }

    // 4. Coupons
    if (this.exportOptions.coupons) {
      xml += `   <Row ss:Height="24">\n`;
      xml += `    <Cell ss:MergeAcross="2" ss:StyleID="SectionHeader">\n`;
      xml += `     <Data ss:Type="String">III. THỐNG KÊ HIỆU QUẢ CHƯƠNG TRÌNH VOUCHER ƯU ĐÃI</Data>\n`;
      xml += `    </Cell>\n`;
      xml += `   </Row>\n`;

      xml += `   <Row ss:Height="20">\n`;
      xml += `    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Mã giảm giá (Coupon Code)</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableHeaderRight"><Data ss:Type="String">Số lượt quy đổi thành công</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableHeaderRight"><Data ss:Type="String">Tổng số tiền đã chiết khấu</Data></Cell>\n`;
      xml += `   </Row>\n`;

      let totalUsage = 0;
      let totalDiscount = 0;
      this.store.coupons().forEach((c) => {
        xml += `   <Row ss:Height="20">\n`;
        xml += `    <Cell ss:StyleID="TableCell"><Data ss:Type="String">${this.escapeXmlValue(c.couponCode)}</Data></Cell>\n`;
        xml += `    <Cell ss:StyleID="TableCellRight"><Data ss:Type="String">${c.usageCount} lượt</Data></Cell>\n`;
        xml += `    <Cell ss:StyleID="CurrencyCell"><Data ss:Type="Number">-${c.totalDiscountApplied}</Data></Cell>\n`;
        xml += `   </Row>\n`;
        totalUsage += c.usageCount;
        totalDiscount += c.totalDiscountApplied;
      });

      xml += `   <Row ss:Height="22">\n`;
      xml += `    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">TỔNG CHI PHÍ CHIẾT KHẤU TIẾP THỊ</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TotalRowRight"><Data ss:Type="String">${totalUsage} lượt</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="CurrencyCellTotal"><Data ss:Type="Number">-${totalDiscount}</Data></Cell>\n`;
      xml += `   </Row>\n`;

      xml += `   <Row ss:Height="15"/>\n`; // Spacer
    }

    // 5. Customers
    if (this.exportOptions.customers) {
      xml += `   <Row ss:Height="24">\n`;
      xml += `    <Cell ss:MergeAcross="4" ss:StyleID="SectionHeader">\n`;
      xml += `     <Data ss:Type="String">IV. DANH SÁCH KHÁCH HÀNG VIP CÓ ĐÓNG GÓP CAO NHẤT</Data>\n`;
      xml += `    </Cell>\n`;
      xml += `   </Row>\n`;

      xml += `   <Row ss:Height="20">\n`;
      xml += `    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Họ và tên</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Email liên hệ</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableHeaderRight"><Data ss:Type="String">Số đơn đã hoàn tất</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableHeaderRight"><Data ss:Type="String">Doanh thu đóng góp</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Phân hạng thành viên</Data></Cell>\n`;
      xml += `   </Row>\n`;

      let totalSpends = 0;
      this.store.customers().forEach((cust) => {
        const isVip = cust.totalSpent > 10000000;
        xml += `   <Row ss:Height="20">\n`;
        xml += `    <Cell ss:StyleID="TableCell"><Data ss:Type="String">${this.escapeXmlValue(cust.customerName)}</Data></Cell>\n`;
        xml += `    <Cell ss:StyleID="TableCell"><Data ss:Type="String">${this.escapeXmlValue(cust.email)}</Data></Cell>\n`;
        xml += `    <Cell ss:StyleID="TableCellRight"><Data ss:Type="String">${cust.orderCount} đơn hàng</Data></Cell>\n`;
        xml += `    <Cell ss:StyleID="CurrencyCell"><Data ss:Type="Number">${cust.totalSpent}</Data></Cell>\n`;
        xml += `    <Cell ss:StyleID="${isVip ? 'BadgeGold' : 'BadgeSilver'}"><Data ss:Type="String">${isVip ? 'Platinum VIP' : 'Gold Member'}</Data></Cell>\n`;
        xml += `   </Row>\n`;
        totalSpends += cust.totalSpent;
      });

      xml += `   <Row ss:Height="22">\n`;
      xml += `    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">TỔNG DOANH THU NHÓM KHÁCH HÀNG THÂN THIẾT</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TotalRow"><Data ss:Type="String"></Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TotalRowRight"><Data ss:Type="String"></Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="CurrencyCellTotal"><Data ss:Type="Number">${totalSpends}</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="TotalRow"><Data ss:Type="String"></Data></Cell>\n`;
      xml += `   </Row>\n`;
    }

    // 5. AI Copilot Analysis
    if (this.exportOptions.aiAnalysis) {
      xml += `   <Row ss:Height="25"/>\n`; // Spacing row

      xml += `   <Row ss:Height="24">\n`;
      xml += `    <Cell ss:MergeAcross="4" ss:StyleID="SectionHeader">\n`;
      xml += `     <Data ss:Type="String">V. ĐÁNH GIÁ &amp; KHUYẾN NGHỊ TỪ TRỢ LÝ AI</Data>\n`;
      xml += `    </Cell>\n`;
      xml += `   </Row>\n`;

      xml += `   <Row ss:Height="20">\n`;
      xml += `    <Cell ss:MergeAcross="4" ss:StyleID="TableHeader">\n`;
      xml += `     <Data ss:Type="String">Nội dung phân tích</Data>\n`;
      xml += `    </Cell>\n`;
      xml += `   </Row>\n`;

      const aiText = this.store.aiAnalysisResult();
      let content = 'Dữ liệu AI chưa được phân tích hoặc bạn chưa thực hiện phân tích cho kỳ báo cáo này.';
      if (aiText) {
        const cleaned = this.cleanMarkdownForExcel(aiText);
        content = this.escapeXmlValue(cleaned).replace(/\n/g, '&#10;');
      }
      
      // Calculate approximate height to fit text (WrapText requires fixed height in old XML standard)
      const lineBreaks = (content.match(/&#10;/g) || []).length;
      const height = Math.max(80, (content.length / 80) * 15 + lineBreaks * 15);
      
      xml += `   <Row ss:Height="${Math.round(height)}">\n`;
      xml += `    <Cell ss:MergeAcross="4" ss:StyleID="AiCell">\n`;
      xml += `     <Data ss:Type="String">${content}</Data>\n`;
      xml += `    </Cell>\n`;
      xml += `   </Row>\n`;
    }
    
    xml += `  </Table>\n`;
    xml += ` </Worksheet>\n`;
    xml += `</Workbook>\n`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ZenTech_BaoCaoQuatri_${this.store.period()}_${new Date().toISOString().slice(0, 10)}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  protected failedImages = new Set<string>();

  protected onImageError(email: string): void {
    this.failedImages.add(email);
  }

  protected isImageFailed(email: string): boolean {
    return this.failedImages.has(email);
  }
}
