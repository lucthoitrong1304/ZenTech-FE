import { CommonModule, DatePipe } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import {
  LucideCalendarDays,
  LucideCheck,
  LucideChevronLeft,
  LucideChevronRight,
  LucideClock3,
  LucideCopy,
  LucideLoader2,
  LucideMapPin,
  LucideRefreshCw,
  LucideSearch,
  LucideSettings,
  LucideTrash2,
  LucideUndo2,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import * as L from 'leaflet';
import { environment } from '../../../../../../environments/environment';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import {
  AttendanceGeoPoint,
  AttendanceLocationShapeType,
  DailyShift,
  EmployeeWeeklySchedule,
  Shift,
  ShiftType,
} from '../../data-access/models/work-schedule.models';
import { WorkScheduleStore } from '../../data-access/store/work-schedule.store';
import { PermissionService } from '../../../../../core/permissions/permission.service';
import { PermissionCode } from '../../../../../core/permissions/permission.models';

type ShiftSettingsPanel = 'time' | 'rules';

@Component({
  selector: 'app-work-schedules-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    LucideCalendarDays,
    LucideCheck,
    LucideChevronLeft,
    LucideChevronRight,
    LucideClock3,
    LucideCopy,
    LucideLoader2,
    LucideMapPin,
    LucideRefreshCw,
    LucideSearch,
    LucideSettings,
    LucideTrash2,
    LucideUndo2,
    LucideUsers,
    LucideX,
  ],
  templateUrl: './work-schedules-page.component.html',
  styleUrl: './work-schedules-page.component.css',
  providers: [WorkScheduleStore],
})
export class WorkSchedulesPageComponent implements OnDestroy {
  @ViewChild('locationMap')
  private locationMapRef?: ElementRef<HTMLDivElement>;

  protected readonly store = inject(WorkScheduleStore);
  private readonly permissionService = inject(PermissionService);
  protected readonly canUpdateSchedule = computed(() =>
    this.permissionService.has(PermissionCode.SCHEDULE_UPDATE),
  );
  private readonly toastService = inject(ToastService);
  protected readonly pageSlots = Array.from({ length: 5 }, (_, index) => index);
  protected readonly hasMapTilerApiKey = !!environment.mapTilerApiKey;
  protected readonly locatingCurrentPosition = signal(false);
  protected readonly shiftSettingsPanels = signal<Record<string, ShiftSettingsPanel>>({});
  private locationMap?: L.Map;
  private locationTileLayer?: L.TileLayer;
  private locationCircleLayer?: L.Circle;
  private locationCircleCenterLayer?: L.CircleMarker;
  private locationPolygonLayer?: L.Polygon;
  private locationPointLayer?: L.LayerGroup;
  private currentLocationRequested = false;

  constructor() {
    this.store.loadWorkspace();

    effect(() => {
      const message = this.store.successMessage();

      if (message) {
        untracked(() => {
          this.toastService.success(message);
          this.store.clearMessages();
        });
      }
    });

    effect(() => {
      const message = this.store.errorMessage();

      if (message) {
        untracked(() => {
          this.toastService.error(message);
          this.store.clearMessages();
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyLocationMap();
  }

  protected onKeywordInput(event: Event): void {
    this.store.setKeyword(readInputValue(event));
  }

  protected onReasonInput(event: Event): void {
    this.store.setReason(readInputValue(event));
  }

  protected onKeywordEnter(event: Event): void {
    event.preventDefault();
    this.store.applyFilters();
  }

  protected onAssignShiftChange(event: Event): void {
    this.store.setAssignShift(readSelectValue(event));
  }

  protected onBulkShiftChange(event: Event): void {
    this.store.updateBulkDraft({ shiftId: readSelectValue(event) });
  }

  protected onBulkDateInput(field: 'startDate' | 'endDate', event: Event): void {
    this.store.updateBulkDraft({ [field]: readInputValue(event) });
  }

  protected onBulkSelectAllChange(event: Event): void {
    this.store.updateBulkDraft({ selectAll: readCheckboxValue(event) });
  }

  protected onCopyWeekStartInput(
    field: 'fromWeekStartDate' | 'toWeekStartDate',
    event: Event,
  ): void {
    this.store.setCopyWeekStart(field, readInputValue(event));
  }

  protected onShiftTimeInput(shiftId: string, field: 'startTime' | 'endTime', event: Event): void {
    this.store.updateShiftDraft(shiftId, { [field]: normalizeTime(readInputValue(event)) });
  }

  protected getShiftSettingsPanel(shiftId: string): ShiftSettingsPanel {
    return this.shiftSettingsPanels()[shiftId] ?? 'rules';
  }

  protected setShiftSettingsPanel(shiftId: string, panel: ShiftSettingsPanel): void {
    this.shiftSettingsPanels.update((panels) => ({ ...panels, [shiftId]: panel }));
  }

  protected onShiftNumberInput(
    shiftId: string,
    field:
      | 'earlyCheckInMinutes'
      | 'lateCheckOutMinutes'
      | 'onTimeCheckInStartMinutes'
      | 'onTimeCheckInEndMinutes'
      | 'onTimeCheckOutStartMinutes'
      | 'onTimeCheckOutEndMinutes',
    event: Event,
  ): void {
    this.store.updateShiftDraft(shiftId, { [field]: readNumberValue(event) });
  }

  protected getOnTimeCheckInRange(
    shift: Pick<Shift, 'onTimeCheckInStartMinutes' | 'onTimeCheckInEndMinutes'>,
  ): number {
    return Math.max(shift.onTimeCheckInStartMinutes, shift.onTimeCheckInEndMinutes);
  }

  protected getOnTimeCheckOutRange(
    shift: Pick<Shift, 'onTimeCheckOutStartMinutes' | 'onTimeCheckOutEndMinutes'>,
  ): number {
    return Math.max(shift.onTimeCheckOutStartMinutes, shift.onTimeCheckOutEndMinutes);
  }

  protected onShiftOnTimeRangeInput(
    shiftId: string,
    action: 'checkIn' | 'checkOut',
    event: Event,
  ): void {
    const value = readNumberValue(event);

    this.store.updateShiftDraft(
      shiftId,
      action === 'checkIn'
        ? {
            onTimeCheckInStartMinutes: value,
            onTimeCheckInEndMinutes: value,
          }
        : {
            onTimeCheckOutStartMinutes: value,
            onTimeCheckOutEndMinutes: value,
          },
    );
  }

  protected onNewShiftInput(field: 'name' | 'colorCode' | 'type', event: Event): void {
    const value = field === 'type' ? readSelectValue(event) : readInputValue(event);
    this.store.updateNewShiftDraft({ [field]: value });
  }

  protected onNewShiftTimeInput(field: 'startTime' | 'endTime', event: Event): void {
    this.store.updateNewShiftDraft({ [field]: normalizeTime(readInputValue(event)) });
  }

  protected onNewShiftNumberInput(
    field:
      | 'earlyCheckInMinutes'
      | 'lateCheckOutMinutes'
      | 'onTimeCheckInStartMinutes'
      | 'onTimeCheckInEndMinutes'
      | 'onTimeCheckOutStartMinutes'
      | 'onTimeCheckOutEndMinutes',
    event: Event,
  ): void {
    this.store.updateNewShiftDraft({ [field]: readNumberValue(event) });
  }

  protected onNewShiftOnTimeRangeInput(action: 'checkIn' | 'checkOut', event: Event): void {
    const value = readNumberValue(event);

    this.store.updateNewShiftDraft(
      action === 'checkIn'
        ? {
            onTimeCheckInStartMinutes: value,
            onTimeCheckInEndMinutes: value,
          }
        : {
            onTimeCheckOutStartMinutes: value,
            onTimeCheckOutEndMinutes: value,
          },
    );
  }

  protected onPolicyEnabledChange(event: Event): void {
    this.store.updateLocationPolicyDraft({ enabled: readCheckboxValue(event) });
  }

  protected onShapeTypeChange(event: Event): void {
    this.store.setLocationShapeType(readSelectValue(event) as AttendanceLocationShapeType);
    this.renderLocationOverlay();
  }

  protected onCircleRadiusInput(event: Event): void {
    this.store.setCircleRadius(readNumberValue(event));
    this.renderLocationOverlay();
  }

  protected onCenterCoordinateInput(
    field: 'centerLatitude' | 'centerLongitude',
    event: Event,
  ): void {
    this.store.setCircleCoordinate(field, readOptionalNumberValue(event));
    this.recenterLocationMapToDraft();
    this.renderLocationOverlay();
  }

  protected onSettingsTabClick(tab: 'shifts' | 'location'): void {
    this.store.setSettingsTab(tab);

    if (tab === 'location') {
      window.setTimeout(() => {
        this.ensureLocationMap();
        
        const policy = this.store.locationPolicyDraft();
        const hasValidCoords = (policy.shapeType === 'CIRCLE' && isValidLatitude(policy.centerLatitude) && isValidLongitude(policy.centerLongitude)) || 
                               (policy.shapeType === 'POLYGON' && policy.polygonPoints && policy.polygonPoints.length > 0);

        if (!hasValidCoords) {
          this.requestCurrentLocationCenter();
        }
      }, 0);
    } else {
      this.destroyLocationMap();
    }
  }

  protected onGetGPSClick(): void {
    this.currentLocationRequested = false;
    this.requestCurrentLocationCenter();
  }

  protected closeSettingsModal(): void {
    if (this.store.saving()) {
      return;
    }

    this.destroyLocationMap();
    this.store.closeSettingsModal();
  }

  protected undoPolygonPoint(): void {
    this.store.undoPolygonPoint();
    this.renderLocationOverlay();
  }

  protected clearPolygonPoints(): void {
    this.store.clearPolygonPoints();
    this.renderLocationOverlay();
  }

  private ensureLocationMap(): void {
    if (!this.hasMapTilerApiKey || !this.locationMapRef?.nativeElement) {
      return;
    }

    if (this.locationMap) {
      this.locationMap.invalidateSize();
      this.renderLocationOverlay();
      return;
    }

    const center = this.getLocationMapCenter();
    this.locationMap = L.map(this.locationMapRef.nativeElement, {
      center: [center.lat, center.lng],
      zoom: 16,
      zoomControl: true,
    });
    this.locationTileLayer = L.tileLayer(
      `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${encodeURIComponent(environment.mapTilerApiKey)}`,
      {
        maxZoom: 20,
        tileSize: 512,
        zoomOffset: -1,
        attribution:
          '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
      },
    ).addTo(this.locationMap);
    this.locationPointLayer = L.layerGroup().addTo(this.locationMap);
    this.locationMap.on('click', (event) => this.handleLocationMapClick(event));

    window.setTimeout(() => this.locationMap?.invalidateSize(), 0);
    this.renderLocationOverlay();
  }

  private handleLocationMapClick(event: L.LeafletMouseEvent): void {
    const point = {
      lat: event.latlng.lat,
      lng: event.latlng.lng,
    };

    if (this.store.locationPolicyDraft().shapeType === 'CIRCLE') {
      this.store.setCircleCenter(point);
    } else {
      this.store.addPolygonPoint(point);
    }

    this.renderLocationOverlay();
  }

  private renderLocationOverlay(): void {
    if (!this.locationMap) {
      return;
    }

    const policy = this.store.locationPolicyDraft();
    if (policy.shapeType === 'CIRCLE') {
      this.clearPolygonOverlay();

      if (!isValidLatitude(policy.centerLatitude) || !isValidLongitude(policy.centerLongitude)) {
        this.clearCircleOverlay();
        return;
      }

      const center: L.LatLngExpression = [policy.centerLatitude, policy.centerLongitude];
      const radius = policy.radiusMeters || 100;

      if (this.locationCircleLayer) {
        this.locationCircleLayer.setLatLng(center);
        this.locationCircleLayer.setRadius(radius);
      } else {
        this.locationCircleLayer = L.circle(center, {
          radius,
          color: '#4f46e5',
          fillColor: '#4f46e5',
          fillOpacity: 0.18,
          opacity: 0.9,
          weight: 2,
          interactive: false,
        }).addTo(this.locationMap);
      }

      this.renderLocationCenterMarker(center);
      return;
    }

    this.clearCircleRadiusOverlay();
    this.clearPolygonOverlay();
    this.locationPointLayer?.clearLayers();

    if (isValidLatitude(policy.centerLatitude) && isValidLongitude(policy.centerLongitude)) {
      this.renderLocationCenterMarker([policy.centerLatitude, policy.centerLongitude]);
    } else {
      this.clearLocationCenterMarker();
    }

    const polygonPoints = policy.polygonPoints.map(
      (point) => [point.lat, point.lng] as L.LatLngExpression,
    );
    polygonPoints.forEach((point, index) => {
      L.circleMarker(point, {
        radius: 5,
        color: '#ffffff',
        fillColor: '#4f46e5',
        fillOpacity: 1,
        weight: 2,
      })
        .bindTooltip(`${index + 1}`, { permanent: false })
        .addTo(this.locationPointLayer!);
    });

    if (polygonPoints.length >= 2) {
      this.locationPolygonLayer = L.polygon(polygonPoints, {
        color: '#4f46e5',
        fillColor: '#4f46e5',
        fillOpacity: 0.18,
        opacity: 0.9,
        weight: 2,
      }).addTo(this.locationMap);
    }
  }

  private destroyLocationMap(): void {
    this.locationCircleLayer = undefined;
    this.locationCircleCenterLayer = undefined;
    this.locationPolygonLayer = undefined;
    this.locationPointLayer = undefined;
    this.locationTileLayer = undefined;
    this.locationMap?.off();
    this.locationMap?.remove();
    this.locationMap = undefined;
  }

  private clearCircleOverlay(): void {
    this.clearCircleRadiusOverlay();
    this.clearLocationCenterMarker();
  }

  private clearCircleRadiusOverlay(): void {
    this.locationCircleLayer?.remove();
    this.locationCircleLayer = undefined;
  }

  private renderLocationCenterMarker(center: L.LatLngExpression): void {
    if (!this.locationMap) {
      return;
    }

    if (this.locationCircleCenterLayer) {
      this.locationCircleCenterLayer.setLatLng(center);
    } else {
      this.locationCircleCenterLayer = L.circleMarker(center, {
        radius: 6,
        color: '#ffffff',
        fillColor: '#4f46e5',
        fillOpacity: 1,
        weight: 2,
        interactive: false,
      }).addTo(this.locationMap);
    }
  }

  private clearLocationCenterMarker(): void {
    this.locationCircleCenterLayer?.remove();
    this.locationCircleCenterLayer = undefined;
  }

  private clearPolygonOverlay(): void {
    this.locationPolygonLayer?.remove();
    this.locationPolygonLayer = undefined;
    this.locationPointLayer?.clearLayers();
  }

  private getLocationMapCenter(): AttendanceGeoPoint {
    const policy = this.store.locationPolicyDraft();

    if (policy.shapeType === 'POLYGON' && policy.polygonPoints.length > 0) {
      return policy.polygonPoints[0];
    }

    if (isValidLatitude(policy.centerLatitude) && isValidLongitude(policy.centerLongitude)) {
      return {
        lat: policy.centerLatitude,
        lng: policy.centerLongitude,
      };
    }

    return {
      lat: 10.762622,
      lng: 106.660172,
    };
  }

  private requestCurrentLocationCenter(): void {
    if (this.currentLocationRequested) {
      return;
    }

    this.currentLocationRequested = true;
    this.locatingCurrentPosition.set(true);

    if (!('geolocation' in navigator)) {
      this.locatingCurrentPosition.set(false);
      this.toastService.warning(
        'Trình duyệt chưa hỗ trợ lấy vị trí. Vui lòng nhập tọa độ thủ công.',
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        this.store.setCircleCenter(point);
        this.recenterLocationMapToDraft();
        this.renderLocationOverlay();
        this.locatingCurrentPosition.set(false);
      },
      () => {
        this.locatingCurrentPosition.set(false);
        this.toastService.warning('Vui lòng mở quyền vị trí để lấy tọa độ GPS hiện tại.');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 10000,
      },
    );
  }

  private recenterLocationMapToDraft(): void {
    if (!this.locationMap) {
      return;
    }

    const policy = this.store.locationPolicyDraft();
    if (!isValidLatitude(policy.centerLatitude) || !isValidLongitude(policy.centerLongitude)) {
      return;
    }

    this.locationMap.setView(
      [policy.centerLatitude, policy.centerLongitude],
      this.locationMap.getZoom(),
    );
  }

  protected getShiftsForDate(employee: EmployeeWeeklySchedule, workDate: string): DailyShift[] {
    return employee.shifts
      .filter((shift) => shift.workDate === workDate)
      .sort((first, second) => (first.startTime ?? '').localeCompare(second.startTime ?? ''));
  }

  protected getDayLabel(workDate: string): string {
    const date = new Date(`${workDate}T00:00:00`);
    const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    return labels[date.getDay()];
  }

  protected getShiftTypeLabel(type: ShiftType): string {
    switch (type) {
      case 'OFF':
        return 'Nghỉ';
      case 'DEFAULT':
        return 'Mặc định';
      default:
        return 'Làm việc';
    }
  }

  protected getShiftTimeRange(shift: Pick<Shift | DailyShift, 'startTime' | 'endTime'>): string {
    if (!shift.startTime && !shift.endTime) {
      return 'Ca linh hoạt';
    }

    return `${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}`;
  }

  protected getDayCoverageLabel(shifts: DailyShift[]): string {
    if (shifts.length === 0) {
      return 'Chưa xếp lịch';
    }

    const sortedShifts = [...shifts].sort((first, second) =>
      (first.startTime ?? '').localeCompare(second.startTime ?? ''),
    );

    return `${formatTime(sortedShifts[0].startTime)} - ${formatTime(sortedShifts[sortedShifts.length - 1].endTime)}`;
  }

  protected isShiftAssigned(shifts: DailyShift[], shiftId: string): boolean {
    return shifts.some((shift) => shift.shiftId === shiftId);
  }

  protected getEmployeeInitials(employeeName: string): string {
    const initials = employeeName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');

    return initials || 'ZT';
  }

  protected isEmployeeSelected(employeeId: string): boolean {
    return this.store.selectedEmployeeIds().includes(employeeId);
  }

  protected getPageNumber(slot: number): number | null {
    const totalPages = this.store.totalPages();

    if (totalPages <= 0) {
      return null;
    }

    const currentPage = this.store.query().page;
    const start = Math.min(Math.max(currentPage - 2, 0), Math.max(totalPages - 5, 0));
    const page = start + slot;

    return page < totalPages ? page : null;
  }
}

function readInputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : '';
}

function readSelectValue(event: Event): string {
  return event.target instanceof HTMLSelectElement ? event.target.value : '';
}

function readCheckboxValue(event: Event): boolean {
  return event.target instanceof HTMLInputElement ? event.target.checked : false;
}

function readNumberValue(event: Event): number {
  if (!(event.target instanceof HTMLInputElement)) {
    return 0;
  }

  return Number(event.target.value || 0);
}

function readOptionalNumberValue(event: Event): number | null {
  if (!(event.target instanceof HTMLInputElement) || event.target.value === '') {
    return null;
  }

  const value = Number(event.target.value);

  return Number.isFinite(value) ? value : null;
}

function isValidLatitude(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= -180 && value <= 180;
}

function normalizeTime(value: string): string | null {
  return value ? `${value}:00` : null;
}

function formatTime(value: string | null): string {
  return value ? value.slice(0, 5) : '--:--';
}
