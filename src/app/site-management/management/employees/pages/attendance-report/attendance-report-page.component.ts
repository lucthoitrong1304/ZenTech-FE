import { Component, ChangeDetectionStrategy, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceReportStore } from '../../../data-access/store/attendance-report.store';
import { AttendanceStatisticsCardsComponent } from './components/attendance-statistics-cards/attendance-statistics-cards.component';
import { AttendanceTableComponent } from './components/attendance-table/attendance-table.component';
import { LucideAlertCircle, LucideFilter } from '@lucide/angular';

@Component({
  selector: 'app-attendance-report',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, AttendanceStatisticsCardsComponent, AttendanceTableComponent, LucideAlertCircle, LucideFilter],
  templateUrl: './attendance-report-page.component.html',
  styleUrl: './attendance-report-page.component.css'
})
export class AttendanceReportPageComponent implements OnInit, OnDestroy {
  protected readonly store = inject(AttendanceReportStore);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  // For the date inputs
  startDate = this.store.startDate();
  endDate = this.store.endDate();

  ngOnInit() {
    this.store.loadReport();
    this.refreshTimer = setInterval(() => {
      if (this.store.records().some(record => record.isProvisional || this.isLiveMissingCheckout(record))) {
        this.store.loadReport();
      }
    }, 60000);
  }

  ngOnDestroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  onFilter() {
    this.store.updateFilter(this.startDate, this.endDate);
    this.store.loadReport();
  }

  onPageChange(event: { page: number, size: number }) {
    this.store.updatePagination(event.page, event.size);
    this.store.loadReport();
  }

  private isLiveMissingCheckout(record: { status: string; checkInTime: string | null; checkOutTime: string | null; workDate: string }): boolean {
    return record.status === 'MISSING_CHECK_OUT'
      && !!record.checkInTime
      && !record.checkOutTime
      && record.workDate === this.formatToday();
  }

  private formatToday(): string {
    const today = new Date();
    const month = `${today.getMonth() + 1}`.padStart(2, '0');
    const day = `${today.getDate()}`.padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
  }
}
