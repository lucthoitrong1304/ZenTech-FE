import { CommonModule } from '@angular/common';
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
  LucideSearch,
  LucideSettings,
  LucideShoppingBag,
  LucideStore,
  LucideUser,
  LucideUsers,
  LucideWarehouse,
} from '@lucide/angular';
import { PopoverModule } from 'primeng/popover';
import { filter } from 'rxjs';
import { AuthStorageService } from '../../../../core/services/auth-storage.service';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { ManagementShellUiState } from '../../data-access/state/management-shell-ui.state';

export enum ProfileMenuOption {
  Profile = 'PROFILE',
  ChangePassword = 'CHANGE_PASSWORD',
  Settings = 'SETTINGS',
  Logout = 'LOGOUT',
}

interface ManagementNavItem {
  label: string;
  path: string;
  icon: string;
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
    LucideBell,
    LucideBot,
    LucideChartBar,
    LucideChartNoAxesCombined,
    LucideChevronDown,
    LucideKey,
    LucideLayoutDashboard,
    LucideLogOut,
    LucideMegaphone,
    LucideMessageCircle,
    LucidePackage,
    LucideSearch,
    LucideSettings,
    LucideShoppingBag,
    LucideUser,
    LucideUsers,
    LucideWarehouse,
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
  protected readonly managementShellUi = inject(ManagementShellUiState);
  protected readonly ProfileMenuOption = ProfileMenuOption;


  protected readonly header = signal<ManagementHeaderState>(DEFAULT_HEADER);
  protected readonly currentUrl = signal(this.router.url);
  protected readonly chatSidebarActive = computed(
    () => this.isChatRoute(this.currentUrl()) && this.managementShellUi.sidebarMode() === 'chatFilters'
  );
  protected readonly showAdminSidebar = computed(() => !this.chatSidebarActive());
  protected readonly currentUser = this.authSessionStore.currentUser;
  protected readonly accountInitials = computed(() => {
    const fullName = this.currentUser()?.fullName?.trim();

    if (!fullName) {
      return 'ZT';
    }

    return fullName
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
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
        { label: 'Tư vấn khách hàng', path: '/management/chat', icon: 'chat' },
        { label: 'Đơn hàng', path: '/management/orders', icon: 'orders' },
        { label: 'Sản phẩm', path: '/management/products', icon: 'products' },
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
    if (this.isChatRoute(item.path)) {
      this.managementShellUi.showChatFilters();
      return;
    }

    this.managementShellUi.showAdminSidebar();
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
