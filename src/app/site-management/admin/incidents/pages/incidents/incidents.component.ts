import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideEye, LucideRotateCcw, LucideSearch } from '@lucide/angular';
import { AdminStore } from '../../../data-access/store/admin.store';
import { IncidentStatus, IncidentSeverity, SystemIncident } from '../../../data-access/models/admin.models';

@Component({
  selector: 'app-admin-incidents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideEye,
    LucideRotateCcw,
    LucideSearch
  ],
  templateUrl: './incidents.component.html',
  styleUrl: './incidents.component.css'
})
export class IncidentsComponent implements OnInit {
  protected readonly store = inject(AdminStore);
  private readonly router = inject(Router);

  protected readonly IncidentStatus = IncidentStatus;
  protected readonly IncidentSeverity = IncidentSeverity;
  protected readonly activeFilter = signal<IncidentStatus | 'ALL'>('ALL');

  protected searchVal = '';
  protected severityVal: IncidentSeverity | 'ALL' = 'ALL';
  protected startDateVal = '';
  protected endDateVal = '';

  ngOnInit(): void {
    this.store.loadIncidents({});
  }

  protected handleFilterChange(filter: IncidentStatus | 'ALL'): void {
    this.activeFilter.set(filter);
    this.store.setIncidentFilter(filter);
    // Ta vẫn gọi API để tải danh sách tương ứng
    this.store.loadIncidents({
      status: filter === 'ALL' ? undefined : filter
    });
  }

  protected onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchVal = input.value;
    this.store.setIncidentSearch(this.searchVal);
  }

  protected onSeverityFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.severityVal = select.value as IncidentSeverity | 'ALL';
    this.store.setIncidentSeverityFilter(this.severityVal);
  }

  protected onDateRangeChange(): void {
    const start = this.startDateVal ? this.startDateVal : null;
    const end = this.endDateVal ? this.endDateVal : null;
    this.store.setIncidentDateRange(start, end);
  }

  protected handleResetFilters(): void {
    this.searchVal = '';
    this.severityVal = 'ALL';
    this.startDateVal = '';
    this.endDateVal = '';
    this.activeFilter.set('ALL');
    this.store.resetIncidentFilters();
    this.store.loadIncidents({});
  }

  protected viewIncidentDetails(incident: SystemIncident): void {
    this.router.navigate(['/admin/incidents', incident.id]);
  }
}
