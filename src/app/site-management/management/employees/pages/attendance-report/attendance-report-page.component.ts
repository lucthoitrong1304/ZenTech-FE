import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceReportStore } from '../../../data-access/store/attendance-report.store';
import { AttendanceStatisticsCardsComponent } from './components/attendance-statistics-cards/attendance-statistics-cards.component';
import { AttendanceTableComponent } from './components/attendance-table/attendance-table.component';
import { LucideAlertCircle } from '@lucide/angular';

@Component({
  selector: 'app-attendance-report',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, AttendanceStatisticsCardsComponent, AttendanceTableComponent, LucideAlertCircle],
  templateUrl: './attendance-report-page.component.html',
  styleUrl: './attendance-report-page.component.css'
})
export class AttendanceReportPageComponent implements OnInit {
  protected readonly store = inject(AttendanceReportStore);

  // For the date inputs
  startDate = this.store.startDate();
  endDate = this.store.endDate();

  ngOnInit() {
    this.store.loadReport();
  }

  onFilter() {
    this.store.updateFilter(this.startDate, this.endDate);
    this.store.loadReport();
  }

  onPageChange(event: { page: number, size: number }) {
    this.store.updatePagination(event.page, event.size);
    this.store.loadReport();
  }
}
