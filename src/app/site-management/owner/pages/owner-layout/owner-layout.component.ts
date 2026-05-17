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
  LucideDownload,
  LucideLayoutDashboard,
  LucideLogOut,
  LucideMegaphone,
  LucideMessageCircle,
  LucidePackage,
  LucidePlus,
  LucideSearch,
  LucideShoppingBag,
  LucideStore,
  LucideUsers,
  LucideWarehouse,
} from '@lucide/angular';
import { filter } from 'rxjs';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { OwnerShellUiState } from '../../data-access/state/owner-shell-ui.state';

interface OwnerNavItem {
  label: string;
  path: string;
  icon: string;
}

interface OwnerNavSection {
  title: string;
  items: OwnerNavItem[];
}

interface OwnerHeaderState {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: string;
  hidePageHeader: boolean;
}

const DEFAULT_HEADER: OwnerHeaderState = {
  eyebrow: 'Tổng quan hệ thống',
  title: 'Bảng điều khiển',
  description: 'Theo dõi hiệu suất kinh doanh, đơn hàng và tín hiệu vận hành theo thời gian thực.',
  primaryAction: 'Hành động mới',
  hidePageHeader: false,
};

@Component({
  selector: 'app-owner-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    LucideBell,
    LucideBot,
    LucideCalendar,
    LucideChartBar,
    LucideChartNoAxesCombined,
    LucideDownload,
    LucideLayoutDashboard,
    LucideLogOut,
    LucideMegaphone,
    LucideMessageCircle,
    LucidePackage,
    LucidePlus,
    LucideSearch,
    LucideShoppingBag,
    LucideStore,
    LucideUsers,
    LucideWarehouse,
  ],
  providers: [OwnerShellUiState],
  templateUrl: './owner-layout.component.html',
  styleUrl: './owner-layout.component.css',
})
export class OwnerLayoutComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSessionStore = inject(AuthSessionStore);
  protected readonly ownerShellUi = inject(OwnerShellUiState);

  protected readonly header = signal<OwnerHeaderState>(DEFAULT_HEADER);
  protected readonly currentUrl = signal(this.router.url);
  protected readonly chatSidebarActive = computed(
    () => this.isChatRoute(this.currentUrl()) && this.ownerShellUi.sidebarMode() === 'chatFilters'
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

  protected readonly navSections: OwnerNavSection[] = [
    {
      title: 'Tổng quan hệ thống',
      items: [
        { label: 'Bảng điều khiển', path: '/owner/dashboard', icon: 'dashboard' },
        { label: 'Phân tích kinh doanh', path: '/owner/analytics', icon: 'analytics' },
      ],
    },
    {
      title: 'Điều hành kinh doanh',
      items: [
        { label: 'Nhân viên', path: '/owner/employees', icon: 'employees' },
        { label: 'Tư vấn khách hàng', path: '/owner/chat', icon: 'chat' },
        { label: 'Đơn hàng', path: '/owner/orders', icon: 'orders' },
        { label: 'Sản phẩm', path: '/owner/products', icon: 'products' },
        { label: 'Kho hàng', path: '/owner/inventory', icon: 'inventory' },
        { label: 'Khách hàng', path: '/owner/customers', icon: 'customers' },
        { label: 'Marketing', path: '/owner/marketing', icon: 'marketing' },
      ],
    },
    {
      title: 'Quản trị hệ thống',
      items: [
        { label: 'Quản lý AI', path: '/owner/ai-management', icon: 'ai' },
        { label: 'Báo cáo & Thống kê', path: '/owner/reports', icon: 'reports' },
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

  protected handleNavItemClicked(item: OwnerNavItem): void {
    if (this.isChatRoute(item.path)) {
      this.ownerShellUi.showChatFilters();
      return;
    }

    this.ownerShellUi.showAdminSidebar();
  }

  protected logout(): void {
    this.authSessionStore.logout();
    this.router.navigate(['/auth/login']);
  }

  private syncSidebarMode(): void {
    if (this.isChatRoute(this.router.url)) {
      this.ownerShellUi.showChatFilters();
      return;
    }

    this.ownerShellUi.showAdminSidebar();
  }

  private isChatRoute(url: string): boolean {
    const path = url.split(/[?#]/)[0];

    return path === '/owner/chat' || path.startsWith('/owner/chat/');
  }

  private syncHeader(): void {
    const data = this.getActiveRouteData();

    this.header.set({
      eyebrow: typeof data['eyebrow'] === 'string' ? data['eyebrow'] : DEFAULT_HEADER.eyebrow,
      title: typeof data['title'] === 'string' ? data['title'] : DEFAULT_HEADER.title,
      description:
        typeof data['description'] === 'string' ? data['description'] : DEFAULT_HEADER.description,
      primaryAction:
        typeof data['primaryAction'] === 'string' ? data['primaryAction'] : DEFAULT_HEADER.primaryAction,
      hidePageHeader: data['hidePageHeader'] === true,
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
