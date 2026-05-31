import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideBell,
  LucideBot,
  LucideCalendar,
  LucideChartBar,
  LucideChartNoAxesCombined,
  LucideChevronDown,
  LucideDownload,
  LucideKey,
  LucideLayoutDashboard,
  LucideLogOut,
  LucideMegaphone,
  LucideMessageCircle,
  LucidePackage,
  LucidePlus,
  LucideScanFace,
  LucideSearch,
  LucideSettings,
  LucideShoppingBag,
  LucideStore,
  LucideUser,
  LucideUsers,
  LucideWarehouse,
} from '@lucide/angular';
import { PopoverModule } from 'primeng/popover';
import { DialogModule } from 'primeng/dialog';
import { filter, finalize } from 'rxjs';
import { AuthStorageService } from '../../../../core/services/auth-storage.service';
import { FaceCheckinData, FaceCheckinDialogComponent } from '../../../../shared/components/face-checkin-dialog/face-checkin-dialog.component';
import { FaceRegisterData, FaceRegisterDialogComponent } from '../../../../shared/components/face-register-dialog/face-register-dialog.component';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { Role } from '../../../auth/data-access/models/auth.enums';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { hasRole } from '../../../auth/data-access/utils/auth-role.utils';
import { ManagementShellUiState } from '../../data-access/state/management-shell-ui.state';
import { CommandPaletteComponent } from '../../components/command-palette/command-palette.component';
import { CommandPaletteService } from '../../data-access/services/command-palette.service';
import { NotificationBellComponent } from '../../../../shared/components/notification-bell/notification-bell.component';
import { AttendanceService } from '../../data-access/services/attendance.service';
import { ProfileService } from '../../data-access/services/profile.service';

export enum ProfileMenuOption {
  Profile = 'PROFILE',
  ChangePassword = 'CHANGE_PASSWORD',
  Settings = 'SETTINGS',
  Logout = 'LOGOUT',
}

interface ManagementNavItem {
  label: string;
  path?: string;
  icon: string;
  key?: string;
  children?: ManagementNavItem[];
}

interface ManagementNavSection {
  title: string;
  items: ManagementNavItem[];
}

interface ManagementHeaderState {
  eyebrow: string;
  title: string;
}

const DEFAULT_HEADER: ManagementHeaderState = {
  eyebrow: 'Tổng quan hệ thống',
  title: 'Bảng điều khiển',
};

@Component({
  selector: 'app-management-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    PopoverModule,
    DialogModule,
    LucideBot,
    LucideCalendar,
    LucideChartBar,
    LucideChartNoAxesCombined,
    LucideChevronDown,
    LucideKey,
    LucideLayoutDashboard,
    LucideLogOut,
    LucideMegaphone,
    LucideMessageCircle,
    LucidePackage,
    LucideScanFace,
    LucideSearch,
    LucideSettings,
    LucideShoppingBag,
    LucideUser,
    LucideUsers,
    LucideWarehouse,
    CommandPaletteComponent,
    FaceCheckinDialogComponent,
    FaceRegisterDialogComponent,
    NotificationBellComponent,
  ],
  providers: [ManagementShellUiState],
  templateUrl: './management-layout.component.html',
  styleUrl: './management-layout.component.css',
})
export class ManagementLayoutComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSessionStore = inject(AuthSessionStore);
  private readonly authStorageService = inject(AuthStorageService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly profileService = inject(ProfileService);
  private readonly toastService = inject(ToastService);
  protected readonly managementShellUi = inject(ManagementShellUiState);
  protected readonly commandPaletteService = inject(CommandPaletteService);
  protected readonly ProfileMenuOption = ProfileMenuOption;

  protected readonly header = signal<ManagementHeaderState>(DEFAULT_HEADER);
  protected readonly currentUrl = signal(this.router.url);
  protected readonly checkinDialogVisible = signal(false);
  protected readonly registerDialogVisible = signal(false);
  protected readonly checkinSubmitting = signal(false);
  protected readonly expandedNavKeys = signal<ReadonlySet<string>>(new Set(['products']));
  protected readonly chatSidebarActive = computed(
    () => this.isChatRoute(this.currentUrl()) && this.managementShellUi.sidebarMode() === 'chatFilters'
  );
  protected readonly showAdminSidebar = computed(() => !this.chatSidebarActive());
  protected readonly currentUser = this.authSessionStore.currentUser;
  protected readonly canUseCheckin = computed(() => {
    const roles = this.currentUser()?.roles ?? [];

    return (
      hasRole(roles, Role.OWNER) ||
      hasRole(roles, Role.MANAGER) ||
      hasRole(roles, Role.EMPLOYEE)
    );
  });
  protected readonly accountInitials = computed(() => {
    let name = this.currentUser()?.fullName?.trim();
    if (!name) return 'ZT';
    if (name.includes('@')) name = name.split('@')[0];

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  });

  protected readonly displayName = computed(() => {
    const fullName = this.currentUser()?.fullName?.trim();
    if (!fullName) return 'Management User';
    if (fullName.includes('@')) return fullName.split('@')[0];
    return fullName;
  });

  protected readonly accountRole = computed(() => {
    const roles = this.currentUser()?.roles || [];
    if (roles.includes('ROLE_OWNER')) return 'OWNER';
    if (roles.includes('ROLE_MANAGER')) return 'MANAGER';
    if (roles.includes('ROLE_EMPLOYEE')) return 'EMPLOYEE';
    return 'MANAGEMENT';
  });

  protected readonly currentUserEmail = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return '';
    }
    return this.authStorageService.getSession()?.email || '';
  });



  protected readonly navSections: ManagementNavSection[] = [
    {
      title: 'Tổng quan hệ thống',
      items: [
        { label: 'Bảng điều khiển', path: '/management/dashboard', icon: 'dashboard' },
        { label: 'Phân tích kinh doanh', path: '/management/analytics', icon: 'analytics' },
      ],
    },
    {
      title: 'Điều hành kinh doanh',
      items: [
        { label: 'Nhân viên', path: '/management/employees', icon: 'employees' },
        { label: 'Lich lam viec', path: '/management/work-schedules', icon: 'schedule' },
        { label: 'Báo cáo chấm công', path: '/management/attendance-report', icon: 'reports' },
        { label: 'Tư vấn khách hàng', path: '/management/chat', icon: 'chat' },
        { label: 'Đơn hàng', path: '/management/orders', icon: 'orders' },
        {
          label: 'Sản phẩm',
          icon: 'products',
          key: 'products',
          children: [
            { label: 'Quản lý sản phẩm', path: '/management/products', icon: 'products' },
            { label: 'Quản lý nhóm', path: '/management/product-groups', icon: 'products' },
          ],
        },
        { label: 'Kho hàng', path: '/management/inventory', icon: 'inventory' },
        { label: 'Khách hàng', path: '/management/customers', icon: 'customers' },
        { label: 'Marketing', path: '/management/marketing', icon: 'marketing' },
      ],
    },
    {
      title: 'Quản trị hệ thống',
      items: [
        { label: 'Quản lý AI', path: '/management/ai-management', icon: 'ai' },
        { label: 'Báo cáo & Thống kê', path: '/management/reports', icon: 'reports' },
      ],
    },
  ];

  constructor() {
    this.syncHeader();
    this.syncSidebarMode();



    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.currentUrl.set(this.router.url);
        this.syncHeader();
        this.syncSidebarMode();
      });
  }

  protected handleNavItemClicked(item: ManagementNavItem): void {
    if (!item.path) {
      this.toggleNavItem(item);
      return;
    }

    if (this.isChatRoute(item.path)) {
      this.managementShellUi.showChatFilters();
      return;
    }

    this.managementShellUi.showAdminSidebar();
  }

  protected toggleNavItem(item: ManagementNavItem): void {
    const key = item.key ?? item.label;

    this.expandedNavKeys.update(current => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  protected isNavItemExpanded(item: ManagementNavItem): boolean {
    return this.expandedNavKeys().has(item.key ?? item.label);
  }

  protected isNavItemActive(item: ManagementNavItem): boolean {
    const currentPath = this.currentUrl().split(/[?#]/)[0];

    if (item.path) {
      return currentPath === item.path || currentPath.startsWith(`${item.path}/`);
    }

    return item.children?.some(child => this.isNavItemActive(child)) ?? false;
  }

  protected logout(): void {
    this.authSessionStore.logout();
    this.router.navigate(['/auth/login']);
  }

  protected handleMenuOption(option: ProfileMenuOption): void {
    switch (option) {
      case ProfileMenuOption.Profile:
        this.router.navigate(['/management/profile']);
        break;
      case ProfileMenuOption.ChangePassword:
        this.router.navigate(['/management/change-password']);
        break;
      case ProfileMenuOption.Settings:
        this.router.navigate(['/management/settings']);
        break;
      case ProfileMenuOption.Logout:
        this.logout();
        break;
    }
  }

  protected openCheckinDialog(): void {
    if (!this.canUseCheckin() || this.checkinSubmitting()) {
      return;
    }

    const user = this.currentUser();
    if (user && !user.hasRegisteredFace) {
      this.registerDialogVisible.set(true);
    } else {
      this.checkinDialogVisible.set(true);
    }
  }

  protected closeCheckinDialog(): void {
    this.checkinDialogVisible.set(false);
  }

  protected handleCheckinSuccess(data: FaceCheckinData): void {
    if (this.checkinSubmitting()) {
      return;
    }

    this.checkinDialogVisible.set(false);
    this.checkinSubmitting.set(true);

    this.attendanceService
      .checkIn({ faceDescriptor: Array.from(data.descriptor) })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.checkinSubmitting.set(false))
      )
      .subscribe({
        next: response => {
          if (response.success) {
            this.toastService.success(response.message || 'Check-in thành công');
            return;
          }

          this.toastService.error(response.message || 'Check-in thất bại. Vui lòng thử lại.');
        },
        error: error => {
          this.toastService.error(readCheckinError(error));
        },
      });
  }

  protected closeRegisterDialog(): void {
    this.registerDialogVisible.set(false);
  }

  protected handleRegisterSuccess(data: FaceRegisterData): void {
    if (this.checkinSubmitting()) {
      return;
    }

    this.registerDialogVisible.set(false);
    this.checkinSubmitting.set(true);

    this.profileService
      .registerFace([Array.from(data.descriptor)])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.checkinSubmitting.set(false))
      )
      .subscribe({
        next: response => {
          if (response.success) {
            this.authSessionStore.updateFaceRegistrationStatus(true);
            this.toastService.success(response.message || 'Đăng ký khuôn mặt thành công');
            return;
          }

          this.toastService.error(response.message || 'Đăng ký thất bại. Vui lòng thử lại.');
        },
        error: error => {
          this.toastService.error(readCheckinError(error));
        },
      });
  }



  private syncSidebarMode(): void {
    if (this.isChatRoute(this.router.url)) {
      this.managementShellUi.showChatFilters();
      return;
    }

    this.managementShellUi.showAdminSidebar();
  }

  private isChatRoute(url: string): boolean {
    const path = url.split(/[?#]/)[0];

    return path === '/management/chat' || path.startsWith('/management/chat/');
  }

  private syncHeader(): void {
    const data = this.getActiveRouteData();

    this.header.set({
      eyebrow: typeof data['eyebrow'] === 'string' ? data['eyebrow'] : DEFAULT_HEADER.eyebrow,
      title: typeof data['title'] === 'string' ? data['title'] : DEFAULT_HEADER.title,
    });
  }

  private getActiveRouteData(): Record<string, unknown> {
    let activeRoute = this.route.firstChild;

    while (activeRoute?.firstChild) {
      activeRoute = activeRoute.firstChild;
    }

    return activeRoute?.snapshot?.data ?? {};
  }
}

function readCheckinError(error: unknown): string {
  if (error instanceof HttpErrorResponse && hasApiMessage(error.error)) {
    const message = error.error.message.trim();

    if (message) {
      return message;
    }
  }

  return 'Check-in thất bại. Vui lòng thử lại.';
}

function hasApiMessage(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
  );
}
