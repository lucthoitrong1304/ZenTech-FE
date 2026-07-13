import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import {
  AttendanceEventTimelineResponse,
  AttendanceLocationPolicy,
  AttendanceRecordResponse,
  AttendanceShiftBreakdownResponse,
} from '@/site-management/management/data-access/models/attendance.model';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronDown,
  LucideChevronUp,
  LucideMapPin,
  LucideX,
} from '@lucide/angular';
import * as L from 'leaflet';
import { environment } from '@env/environment';

interface GroupedDateRecord {
  date: string;
  records: AttendanceRecordResponse[];
  summary: DateGroupSummary;
}

interface DateGroupSummary {
  totalRecords: number;
  totalShifts: number;
  totalEarlyArrival: number;
  totalWfh: number;
  totalMissingCheckIn: number;
  totalWorkingHours: number;
  totalOnTime: number;
  totalLate: number;
  totalEarly: number;
  totalMissingCheckOut: number;
  totalAbsent: number;
  totalLeave: number;
  totalProvisional: number;
  sections: DateGroupSummarySection[];
}

interface DateGroupSummarySection {
  key: SummarySectionKey;
  label: string;
  allRecords: AttendanceRecordResponse[];
}

type SummarySectionKey = 'missingCheckout' | 'absent' | 'leave' | 'late' | 'early' | 'onTime';

interface SelectedEvidence {
  event: AttendanceEventTimelineResponse;
  employeeName: string;
  shiftName: string;
  workDate: string;
}

@Component({
  selector: 'app-attendance-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronDown,
    LucideChevronUp,
    LucideMapPin,
    LucideX
  ],
  templateUrl: './attendance-table.component.html',
  styleUrl: './attendance-table.component.css'
})
export class AttendanceTableComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('evidenceMap') evidenceMapRef?: ElementRef<HTMLDivElement>;

  records = input.required<AttendanceRecordResponse[]>();
  totalRecords = input.required<number>();
  page = input.required<number>();
  size = input.required<number>();
  locationPolicy = input<AttendanceLocationPolicy | null>(null);

  pageChange = output<{page: number, size: number}>();

  expandedRows = signal<Set<string>>(new Set());
  selectedEvidence = signal<SelectedEvidence | null>(null);
  
  openDrawerDate = signal<string | null>(null);
  activeExceptionFilter = signal<SummarySectionKey | null>(null);
  activeDayFilters = signal<Record<string, string[]>>({});

  protected readonly hasMapTilerApiKey = !!environment.mapTilerApiKey;
  private evidenceMap?: L.Map;
  private evidenceTileLayer?: L.TileLayer;
  private renderedEvidenceKey: string | null = null;

  groupedRecords = computed<GroupedDateRecord[]>(() => {
    const groups: { [key: string]: AttendanceRecordResponse[] } = {};
    for (const r of this.records()) {
      const dateKey = r.workDate;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(r);
    }
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(dateKey => ({
        date: dateKey,
        records: groups[dateKey],
        summary: this.buildDateGroupSummary(groups[dateKey])
      }));
  });

  selectedGroupSummary = computed(() => {
    const date = this.openDrawerDate();
    if (!date) return null;
    return this.groupedRecords().find(g => g.date === date) || null;
  });

  ngAfterViewChecked(): void {
    const selected = this.selectedEvidence();
    if (!selected || !this.evidenceMapRef?.nativeElement || !this.hasEventLocation(selected.event)) {
      return;
    }

    const key = this.getEvidenceKey(selected);
    if (this.renderedEvidenceKey === key) {
      this.evidenceMap?.invalidateSize();
      return;
    }

    this.renderedEvidenceKey = key;
    this.renderEvidenceMap(selected);
  }

  ngOnDestroy(): void {
    this.destroyEvidenceMap();
  }

  toggleRow(id: string) {
    const set = new Set(this.expandedRows());
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    this.expandedRows.set(set);
  }

  isExpanded(id: string): boolean {
    return this.expandedRows().has(id);
  }

  pageStart = computed(() => {
    if (this.totalRecords() === 0) return 0;
    return this.page() * this.size() + 1;
  });

  pageEnd = computed(() => {
    const end = (this.page() + 1) * this.size();
    return end > this.totalRecords() ? this.totalRecords() : end;
  });

  onPageChange(newPage: number) {
    this.pageChange.emit({ page: newPage, size: this.size() });
  }

  openEvidence(event: AttendanceEventTimelineResponse, record: AttendanceRecordResponse, shift: AttendanceShiftBreakdownResponse): void {
    this.selectedEvidence.set({
      event,
      employeeName: record.employeeName,
      shiftName: shift.shiftName,
      workDate: record.workDate
    });
  }

  openSummaryRecord(record: AttendanceRecordResponse): void {
    const set = new Set(this.expandedRows());
    set.add(record.id);
    this.expandedRows.set(set);
  }

  openSummaryDrawer(date: string) {
    this.openDrawerDate.set(date);
    this.activeExceptionFilter.set(null);
  }

  closeSummaryDrawer() {
    this.openDrawerDate.set(null);
  }

  openSummaryRecordAndCloseDrawer(recordId: string) {
    const set = new Set(this.expandedRows());
    set.add(recordId);
    this.expandedRows.set(set);
    this.closeSummaryDrawer();
    // Scroll row to view if needed could be added here
  }

  toggleExceptionFilter(key: SummarySectionKey) {
    if (this.activeExceptionFilter() === key) {
      this.activeExceptionFilter.set(null);
    } else {
      this.activeExceptionFilter.set(key);
    }
  }

  toggleDayFilter(date: string, filterKey: string) {
    const current = this.activeDayFilters();
    const next = { ...current };
    const filtersForDate = next[date] ? [...next[date]] : [];
    const index = filtersForDate.indexOf(filterKey);
    if (index > -1) {
      filtersForDate.splice(index, 1);
    } else {
      filtersForDate.push(filterKey);
    }
    if (filtersForDate.length === 0) {
      delete next[date];
    } else {
      next[date] = filtersForDate;
    }
    this.activeDayFilters.set(next);
  }

  clearDayFilter(date: string) {
    const current = this.activeDayFilters();
    if (current[date]) {
      const next = { ...current };
      delete next[date];
      this.activeDayFilters.set(next);
    }
  }

  getFilteredRecords(group: GroupedDateRecord): AttendanceRecordResponse[] {
    const filterKeys = this.activeDayFilters()[group.date];
    if (!filterKeys || filterKeys.length === 0) {
      return group.records;
    }
    return group.records.filter(record => {
      // OR filter: check if record matches ANY of the selected filterKeys
      return filterKeys.some(key => {
        switch (key) {
          case 'earlyArrival':
            return record.shiftBreakdowns?.some(s => s.earlyArrival) ?? false;
          case 'onTime':
            return this.getDisplayStatus(record) === 'ON_TIME';
          case 'late':
            return ['LATE', 'LATE_AND_EARLY'].includes(this.getDisplayStatus(record));
          case 'early':
            return ['EARLY_CHECKOUT', 'LATE_AND_EARLY'].includes(this.getDisplayStatus(record));
          case 'wfh':
            return record.shiftBreakdowns?.some(s => s.isWfh) ?? false;
          case 'missingCheckIn':
            return record.shiftBreakdowns?.some(s => s.status === 'MISSING_CHECK_IN') ?? false;
          case 'missingCheckOut':
            return ['MISSING_CHECK_OUT', 'WFH_MISSING_CHECK_OUT'].includes(this.getDisplayStatus(record));
          default:
            return true;
        }
      });
    });
  }

  filteredSummarySections(group: GroupedDateRecord): DateGroupSummarySection[] {
    const active = this.activeExceptionFilter();
    if (!active) {
      // Mặc định chỉ hiện danh sách vi phạm
      return group.summary.sections.filter(s => s.key !== 'onTime' && s.key !== 'leave' && s.allRecords.length > 0);
    }
    // Nếu bấm filter thì hiện đúng danh sách đó
    return group.summary.sections.filter(s => s.key === active);
  }

  getExceptionCardClass(key: SummarySectionKey, isActive: boolean): string {
    const base = 'exception-card-' + key;
    return isActive ? base + ' active' : base;
  }

  getExceptionTextClass(key: SummarySectionKey): string {
    switch (key) {
      case 'absent': return 'text-rose-700';
      case 'missingCheckout': return 'text-blue-700';
      case 'late': return 'text-red-600';
      case 'early': return 'text-amber-600';
      case 'onTime': return 'text-emerald-700';
      case 'leave': return 'text-teal-700';
      default: return 'text-gray-900';
    }
  }

  closeEvidence(): void {
    this.selectedEvidence.set(null);
    this.renderedEvidenceKey = null;
    this.destroyEvidenceMap();
  }

  hasEvidence(event: AttendanceEventTimelineResponse): boolean {
    return this.hasEventLocation(event) || !!event.faceImageUrl;
  }

  hasEventLocation(event: AttendanceEventTimelineResponse): boolean {
    return this.isValidCoordinate(event.latitude, event.longitude);
  }

  getLocationStatusLabel(event: AttendanceEventTimelineResponse): string {
    if (event.locationValid === true) return 'Trong vùng hợp lệ';
    if (event.locationValid === false) return 'Ngoài vùng hợp lệ';
    return 'Chưa xác định';
  }

  formatMeters(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return 'Không có dữ liệu';
    }
    if (value < 1000) {
      return `${Math.round(value)}m`;
    }
    return `${(value / 1000).toFixed(2)}km`;
  }

  formatCoordinate(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '--';
    }
    return value.toFixed(6);
  }

  getCircleContextLabel(event: AttendanceEventTimelineResponse): string | null {
    const policy = this.locationPolicy();
    if (!policy?.enabled || policy.shapeType !== 'CIRCLE') {
      return null;
    }
    if (!this.isValidCoordinate(policy.centerLatitude, policy.centerLongitude) || !this.hasEventLocation(event)) {
      return null;
    }

    const distanceToCenter = this.haversineMeters(
      policy.centerLatitude!,
      policy.centerLongitude!,
      event.latitude!,
      event.longitude!,
    );
    return `Cách tâm ${this.formatMeters(distanceToCenter)} / bán kính ${this.formatMeters(policy.radiusMeters)}`;
  }

  getStatusBadgeClass(status: string): string {
    if (status && status.startsWith('WFH_')) {
      return 'bg-green-50 text-green-700 border border-green-200';
    }
    switch (status) {
      case 'ON_TIME': return 'bg-green-100 text-green-700';
      case 'LATE': return 'bg-red-100 text-red-700';
      case 'EARLY_CHECKOUT': return 'bg-amber-100 text-amber-700';
      case 'LATE_AND_EARLY': return 'bg-orange-100 text-orange-700';
      case 'MISSING_CHECK_IN': return 'bg-purple-100 text-purple-700';
      case 'MISSING_CHECK_OUT': return 'bg-blue-100 text-blue-700';
      case 'NOT_STARTED': return 'bg-slate-100 text-slate-700';
      case 'ABSENT_UNEXCUSED': return 'bg-rose-100 text-rose-700';
      case 'ABSENT_EXCUSED': return 'bg-teal-100 text-teal-700';
      case 'OFF': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  getStatusLabel(status: string): string {
    if (status && status.startsWith('WFH_')) {
      const rest = status.substring(4);
      return 'WFH - ' + this.getStatusLabel(rest);
    }
    switch (status) {
      case 'ON_TIME': return 'Đúng giờ';
      case 'LATE': return 'Đi muộn';
      case 'EARLY_CHECKOUT': return 'Về sớm';
      case 'LATE_AND_EARLY': return 'Trễ & Sớm';
      case 'MISSING_CHECK_IN': return 'Thiếu Check-in';
      case 'MISSING_CHECK_OUT': return 'Thiếu Check-out';
      case 'NOT_STARTED': return 'Chưa tới ca';
      case 'ABSENT_UNEXCUSED': return 'Vắng không phép';
      case 'ABSENT_EXCUSED': return 'Nghỉ có phép';
      case 'OFF': return 'Ngày nghỉ';
      default: return status;
    }
  }

  getDisplayStatus(record: AttendanceRecordResponse): string {
    if (
      record.status === 'ABSENT_UNEXCUSED' &&
      (record.checkInTime || record.checkOutTime)
    ) {
      if (record.checkInTime && !record.checkOutTime && this.isToday(record.workDate)) {
        return 'MISSING_CHECK_OUT';
      }
      if (record.lateMinutes > 0 && record.earlyMinutes > 0) {
        return 'LATE_AND_EARLY';
      }
      if (record.lateMinutes > 0) {
        return 'LATE';
      }
      if (record.earlyMinutes > 0) {
        return 'EARLY_CHECKOUT';
      }
      return 'ON_TIME';
    }

    return record.status;
  }

  getEventLabel(type: string): string {
    switch (type) {
      case 'CHECK_IN': return 'Vào (Check-in)';
      case 'CHECK_OUT': return 'Ra (Check-out)';
      case 'ADJUSTMENT': return 'Chỉnh công';
      case 'MANUAL': return 'Ghi nhận thủ công';
      case 'IMPORT': return 'Import dữ liệu';
      case 'FACE': return 'Xác thực khuôn mặt';
      default: return type;
    }
  }
  formatScheduleTime(time: string | null): string {
    return time ? time.slice(0, 5) : '--:--';
  }

  formatPenaltyMinutes(minutes: number): string {
    if (!minutes || minutes <= 0) return '0m';
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = minutes / 60.0;
    return `${hours.toFixed(1)}h`;
  }
  isLiveRecord(record: AttendanceRecordResponse): boolean {
    return !!(
      record.isProvisional ||
      (
        record.status === 'MISSING_CHECK_OUT' &&
        record.checkInTime &&
        !record.checkOutTime &&
        this.isToday(record.workDate)
      )
    );
  }

  getDisplayWorkingHours(record: AttendanceRecordResponse): number {
    if (this.isLiveRecord(record) && record.checkInTime) {
      return this.hoursBetweenNow(record.checkInTime);
    }
    return record.workingHours ?? 0;
  }

  isLiveShift(shift: AttendanceShiftBreakdownResponse, workDate: string): boolean {
    return !!(
      shift.isProvisional ||
      (
        shift.status === 'MISSING_CHECK_OUT' &&
        shift.checkInTime &&
        !shift.checkOutTime &&
        this.isToday(workDate)
      )
    );
  }

  getDisplayShiftWorkingHours(shift: AttendanceShiftBreakdownResponse, workDate: string): number {
    if (this.isLiveShift(shift, workDate) && shift.checkInTime) {
      return this.hoursBetweenNow(shift.checkInTime);
    }
    return shift.workingHours ?? 0;
  }

  private hoursBetweenNow(startTime: string): number {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    if (!Number.isFinite(start) || now <= start) {
      return 0;
    }
    return (now - start) / 1000 / 60 / 60;
  }

  private isToday(date: string): boolean {
    const today = new Date();
    const month = `${today.getMonth() + 1}`.padStart(2, '0');
    const day = `${today.getDate()}`.padStart(2, '0');
    return date === `${today.getFullYear()}-${month}-${day}`;
  }

  private buildDateGroupSummary(records: AttendanceRecordResponse[]): DateGroupSummary {
    const summary = records.reduce<DateGroupSummary>((summary, record) => {
      const status = this.getDisplayStatus(record);
      summary.totalRecords += 1;
      summary.totalWorkingHours += this.getDisplayWorkingHours(record);
      summary.totalOnTime += status === 'ON_TIME' ? 1 : 0;
      summary.totalLate += status === 'LATE' || status === 'LATE_AND_EARLY' ? 1 : 0;
      summary.totalEarly += status === 'EARLY_CHECKOUT' || status === 'LATE_AND_EARLY' ? 1 : 0;
      summary.totalMissingCheckOut += status === 'MISSING_CHECK_OUT' || status === 'WFH_MISSING_CHECK_OUT' ? 1 : 0;
      summary.totalAbsent += status === 'ABSENT_UNEXCUSED' ? 1 : 0;
      summary.totalLeave += status === 'ABSENT_EXCUSED' ? 1 : 0;
      summary.totalProvisional += this.isLiveRecord(record) ? 1 : 0;
      return summary;
    }, {
      totalRecords: 0,
      totalShifts: 0,
      totalEarlyArrival: 0,
      totalWfh: 0,
      totalMissingCheckIn: 0,
      totalWorkingHours: 0,
      totalOnTime: 0,
      totalLate: 0,
      totalEarly: 0,
      totalMissingCheckOut: 0,
      totalAbsent: 0,
      totalLeave: 0,
      totalProvisional: 0,
      sections: []
    });

    summary.sections = this.buildDateGroupSummarySections(records);
    const scheduledShiftKeys = new Set<string>();
    for (const record of records) {
      for (const shift of record.shiftBreakdowns ?? []) {
        // Header nói về số loại ca trong ngày, không phải số lượt nhân viên-ca.
        scheduledShiftKeys.add(shift.shiftId ?? shift.shiftName);
        summary.totalEarlyArrival += shift.earlyArrival ? 1 : 0;
        summary.totalWfh += shift.isWfh ? 1 : 0;
        summary.totalMissingCheckIn += shift.status === 'MISSING_CHECK_IN' ? 1 : 0;
      }
    }
    summary.totalShifts = scheduledShiftKeys.size;
    return summary;
  }

  private buildDateGroupSummarySections(records: AttendanceRecordResponse[]): DateGroupSummarySection[] {
    const sections: Array<{ key: SummarySectionKey; label: string; predicate: (record: AttendanceRecordResponse) => boolean }> = [
      { key: 'missingCheckout', label: 'Chưa Check-out', predicate: (record) => ['MISSING_CHECK_OUT', 'WFH_MISSING_CHECK_OUT'].includes(this.getDisplayStatus(record)) },
      { key: 'absent', label: 'Vắng', predicate: (record) => this.getDisplayStatus(record) === 'ABSENT_UNEXCUSED' },
      { key: 'leave', label: 'Nghỉ phép', predicate: (record) => this.getDisplayStatus(record) === 'ABSENT_EXCUSED' },
      { key: 'late', label: 'Trễ', predicate: (record) => ['LATE', 'LATE_AND_EARLY'].includes(this.getDisplayStatus(record)) },
      { key: 'early', label: 'Về sớm', predicate: (record) => ['EARLY_CHECKOUT', 'LATE_AND_EARLY'].includes(this.getDisplayStatus(record)) },
      { key: 'onTime', label: 'Đúng giờ', predicate: (record) => this.getDisplayStatus(record) === 'ON_TIME' },
    ];

    return sections
      .map(section => {
        const matchingRecords = records.filter(section.predicate);
        return {
          key: section.key,
          label: section.label,
          allRecords: matchingRecords,
        };
      })
      .filter(section => section.allRecords.length > 0);
  }

  private renderEvidenceMap(selected: SelectedEvidence): void {
    const event = selected.event;
    if (!this.evidenceMapRef?.nativeElement || !this.hasEventLocation(event)) {
      return;
    }

    this.destroyEvidenceMap();

    const eventPoint: L.LatLngExpression = [event.latitude!, event.longitude!];
    this.evidenceMap = L.map(this.evidenceMapRef.nativeElement, {
      center: eventPoint,
      zoom: 17,
      zoomControl: true,
      attributionControl: true
    });

    this.evidenceTileLayer = L.tileLayer(
      `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${encodeURIComponent(environment.mapTilerApiKey)}`,
      {
        maxZoom: 20,
        tileSize: 512,
        zoomOffset: -1,
        attribution:
          '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
      },
    ).addTo(this.evidenceMap);

    const boundsLayers: L.Layer[] = [];
    this.renderPolicyOverlay(boundsLayers);

    const eventMarker = L.circleMarker(eventPoint, {
      radius: 8,
      color: '#ffffff',
      fillColor: event.locationValid === false ? '#ef4444' : '#10b981',
      fillOpacity: 1,
      weight: 3,
    })
      .bindPopup(`Vị trí chấm công<br>Khoảng cách tới vùng hợp lệ: ${this.formatMeters(event.distanceMeters)}`)
      .addTo(this.evidenceMap)
      .openPopup();
    boundsLayers.push(eventMarker);

    if (event.accuracyMeters && event.accuracyMeters > 0) {
      const accuracyCircle = L.circle(eventPoint, {
        radius: event.accuracyMeters,
        color: '#2563eb',
        fillColor: '#2563eb',
        fillOpacity: 0.04,
        opacity: 0.4,
        weight: 1,
        dashArray: '5 6',
        interactive: false,
      }).addTo(this.evidenceMap);
      boundsLayers.push(accuracyCircle);
    }

    const boundsGroup = L.featureGroup(boundsLayers);
    if (boundsLayers.length > 1) {
      this.evidenceMap.fitBounds(boundsGroup.getBounds().pad(0.18), { maxZoom: 17 });
    }

    window.setTimeout(() => {
      this.evidenceMap?.invalidateSize();
      if (boundsLayers.length > 1) {
        this.evidenceMap?.fitBounds(boundsGroup.getBounds().pad(0.18), { maxZoom: 17 });
      }
    }, 0);
  }

  private renderPolicyOverlay(boundsLayers: L.Layer[]): void {
    const map = this.evidenceMap;
    const policy = this.locationPolicy();
    if (!map || !policy?.enabled) {
      return;
    }

    if (policy.shapeType === 'CIRCLE') {
      if (!this.isValidCoordinate(policy.centerLatitude, policy.centerLongitude)) {
        return;
      }

      const center: L.LatLngExpression = [policy.centerLatitude!, policy.centerLongitude!];
      const radius = policy.radiusMeters || 100;
      const areaCircle = L.circle(center, {
        radius,
        color: '#4f46e5',
        fillColor: '#4f46e5',
        fillOpacity: 0.12,
        opacity: 0.85,
        weight: 2,
        interactive: false,
      }).addTo(map);
      boundsLayers.push(areaCircle);

      const centerMarker = L.circleMarker(center, {
        radius: 6,
        color: '#ffffff',
        fillColor: '#4f46e5',
        fillOpacity: 1,
        weight: 2,
      }).bindTooltip('Tâm vùng hợp lệ', { permanent: false }).addTo(map);
      boundsLayers.push(centerMarker);
      return;
    }

    const polygonPoints = (policy.polygonPoints || [])
      .filter(point => this.isValidCoordinate(point.lat, point.lng))
      .map(point => [point.lat, point.lng] as L.LatLngExpression);

    if (polygonPoints.length < 3) {
      return;
    }

    const polygon = L.polygon(polygonPoints, {
      color: '#4f46e5',
      fillColor: '#4f46e5',
      fillOpacity: 0.12,
      opacity: 0.85,
      weight: 2,
    }).addTo(map);
    boundsLayers.push(polygon);

    polygonPoints.forEach((point, index) => {
      const vertex = L.circleMarker(point, {
        radius: 4,
        color: '#ffffff',
        fillColor: '#4f46e5',
        fillOpacity: 1,
        weight: 2,
      }).bindTooltip(`Điểm vùng ${index + 1}`, { permanent: false }).addTo(map);
      boundsLayers.push(vertex);
    });
  }

  private renderEvidenceMapLegacy(event: AttendanceEventTimelineResponse): void {
    if (!this.evidenceMapRef?.nativeElement || !this.hasEventLocation(event)) {
      return;
    }

    this.destroyEvidenceMap();

    const center: L.LatLngExpression = [event.latitude!, event.longitude!];
    this.evidenceMap = L.map(this.evidenceMapRef.nativeElement, {
      center,
      zoom: 17,
      zoomControl: true,
      attributionControl: true
    });

    this.evidenceTileLayer = L.tileLayer(
      `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${encodeURIComponent(environment.mapTilerApiKey)}`,
      {
        maxZoom: 20,
        tileSize: 512,
        zoomOffset: -1,
        attribution:
          '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
      },
    ).addTo(this.evidenceMap);

    L.circleMarker(center, {
      radius: 8,
      color: '#ffffff',
      fillColor: event.locationValid === false ? '#ef4444' : '#10b981',
      fillOpacity: 1,
      weight: 3,
    })
      .bindPopup(`Vị trí chấm công<br>${this.formatMeters(event.distanceMeters)}`)
      .addTo(this.evidenceMap)
      .openPopup();

    if (event.accuracyMeters && event.accuracyMeters > 0) {
      L.circle(center, {
        radius: event.accuracyMeters,
        color: '#2563eb',
        fillColor: '#2563eb',
        fillOpacity: 0.08,
        opacity: 0.45,
        weight: 1,
        interactive: false,
      }).addTo(this.evidenceMap);
    }

    window.setTimeout(() => this.evidenceMap?.invalidateSize(), 0);
  }

  private destroyEvidenceMap(): void {
    this.evidenceTileLayer = undefined;
    this.evidenceMap?.off();
    this.evidenceMap?.remove();
    this.evidenceMap = undefined;
  }

  private getEvidenceKey(selected: SelectedEvidence): string {
    const event = selected.event;
    return [
      selected.employeeName,
      selected.shiftName,
      event.timestamp,
      event.latitude ?? '',
      event.longitude ?? '',
      event.faceImageUrl ?? '',
      this.locationPolicy()?.id ?? '',
      this.locationPolicy()?.updatedAt ?? ''
    ].join('|');
  }

  private haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const earthRadiusMeters = 6_371_000;
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2))
      * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  private toRadians(value: number): number {
    return value * Math.PI / 180;
  }

  private isValidCoordinate(latitude: number | null | undefined, longitude: number | null | undefined): boolean {
    return latitude !== null
      && latitude !== undefined
      && longitude !== null
      && longitude !== undefined
      && Number.isFinite(latitude)
      && Number.isFinite(longitude);
  }
}
