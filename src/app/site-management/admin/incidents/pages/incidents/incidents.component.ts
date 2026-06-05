import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideEye,
  LucideX
} from '@lucide/angular';
import { AdminStore } from '../../../data-access/store/admin.store';
import { IncidentStatus, IncidentSeverity, SystemIncident } from '../../../data-access/models/admin.models';

@Component({
  selector: 'app-admin-incidents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideEye,
    LucideX
  ],
  templateUrl: './incidents.component.html',
  styleUrl: './incidents.component.css'
})
export class IncidentsComponent {
  protected readonly store = inject(AdminStore);
  protected readonly IncidentStatus = IncidentStatus;
  protected readonly IncidentSeverity = IncidentSeverity;

  protected readonly activeFilter = signal<IncidentStatus | 'ALL'>('ALL');
  protected readonly isModalOpen = signal(false);
  protected readonly selectedIncident = signal<SystemIncident | null>(null);

  // Edit form state
  protected editStatus = IncidentStatus.OPEN;
  protected editSeverity = IncidentSeverity.LOW;
  protected editAssignee = '';

  protected handleFilterChange(filter: IncidentStatus | 'ALL'): void {
    this.activeFilter.set(filter);
    this.store.setIncidentFilter(filter);
  }

  protected openEditModal(incident: SystemIncident): void {
    this.selectedIncident.set(incident);
    this.editStatus = incident.status;
    this.editSeverity = incident.severity;
    this.editAssignee = incident.assignee;
    this.isModalOpen.set(true);
  }

  protected closeEditModal(): void {
    this.isModalOpen.set(false);
    this.selectedIncident.set(null);
  }

  protected handleSaveChanges(): void {
    const incident = this.selectedIncident();
    if (!incident) return;

    this.store.updateIncident(incident.id, this.editStatus, this.editSeverity);
    
    // Simulate updating assignee locally
    incident.assignee = this.editAssignee;

    this.closeEditModal();
  }
}
