import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideLayoutDashboard,
  LucideFileText,
  LucideAlertTriangle,
  LucideTicket,
  LucideChartBar,
  LucideUser,
  LucideKey,
  LucideHistory,
  LucideLogOut,
  LucideChevronDown,
  LucideMenu,
  LucideX,
  LucideSearch,
  LucideBell,
  LucideCommand,
  LucideShieldAlert
} from '@lucide/angular';
import { PopoverModule } from 'primeng/popover';
import { filter } from 'rxjs';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { AuthStorageService } from '../../../../core/services/auth-storage.service';
import { AdminProfileStore } from '../../data-access/store/admin-profile.store';

interface AdminNavItem {
  label: string;
  path: string;
  icon: string;
}

interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

interface AdminHeaderState {
  eyebrow: string;
  title: string;
  description: string;
}

const DEFAULT_HEADER: AdminHeaderState = {
  eyebrow: 'Tổng quan hệ thống',
  title: 'Bảng điều khiển',
  description: 'Giám sát sức khỏe hệ thống, tài nguyên và thống kê tổng quan theo thời gian thực.'
};

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    PopoverModule,
    LucideLayoutDashboard,
    LucideFileText,
    LucideAlertTriangle,
    LucideTicket,
    LucideChartBar,
    LucideUser,
    LucideKey,
    LucideHistory,
    LucideLogOut,
    LucideChevronDown,
    LucideMenu,
    LucideX,
    LucideSearch,
    LucideBell,
    LucideCommand,
    LucideShieldAlert
  ],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSessionStore = inject(AuthSessionStore);
  private readonly authStorageService = inject(AuthStorageService);
  private readonly adminProfileStore = inject(AdminProfileStore);

  protected readonly header = signal<AdminHeaderState>(DEFAULT_HEADER);
  protected readonly currentUrl = signal(this.router.url);
  protected readonly isSidebarOpen = signal(false);
  protected readonly currentUser = this.authSessionStore.currentUser;

  protected readonly navSections: AdminNavSection[] = [
    {
      title: 'Hệ thống',
      items: [
        { label: 'Bảng điều khiển', path: '/admin/dashboard', icon: 'dashboard' }
      ]
    },
    {
      title: 'Giám sát hệ thống',
      items: [
        { label: 'Logs', path: '/admin/logs', icon: 'logs' },
        { label: 'Issues', path: '/admin/issues', icon: 'issues' },
        { label: 'Incidents', path: '/admin/incidents', icon: 'incidents' },
        { label: 'Tickets', path: '/admin/tickets', icon: 'tickets' }
      ]
    },
    {
      title: 'Thống kê',
      items: [
        { label: 'Thống kê hệ thống', path: '/admin/statistics', icon: 'statistics' }
      ]
    },
    {
      title: 'Quản trị hệ thống',
      items: [
        { label: 'Tài khoản', path: '/admin/accounts', icon: 'accounts' },
        { label: 'Phân quyền', path: '/admin/permissions', icon: 'permissions' },
        { label: 'Nhật ký hoạt động', path: '/admin/activity-logs', icon: 'activity-logs' }
      ]
    }
  ];

  protected readonly adminInitials = computed(() => {
    let name = this.currentUser()?.fullName?.trim();
    if (!name) return 'AD';
    if (name.includes('@')) name = name.split('@')[0];

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  });

  protected readonly displayName = computed(() => {
    const fullName = this.currentUser()?.fullName?.trim();
    if (!fullName) return 'System Administrator';
    if (fullName.includes('@')) return fullName.split('@')[0];
    return fullName;
  });

  protected readonly adminEmail = computed(() => {
    return this.adminProfileStore.profile()?.email || this.authStorageService.getSession()?.email || 'admin@zentech.local';
  });

  protected readonly adminAvatarUrl = computed(() => {
    return this.adminProfileStore.profile()?.imageUrl || this.currentUser()?.avatarUrl || null;
  });

  constructor() {
    this.syncHeader();
    this.adminProfileStore.loadProfile();

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.currentUrl.set(this.router.url);
        this.isSidebarOpen.set(false);
        this.syncHeader();
      });
  }

  protected toggleSidebar(): void {
    this.isSidebarOpen.update(isOpen => !isOpen);
  }

  protected closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  protected logout(): void {
    this.authSessionStore.logout();
    this.router.navigate(['/auth/login']);
  }

  private syncHeader(): void {
    const data = this.getActiveRouteData();

    this.header.set({
      eyebrow: typeof data['eyebrow'] === 'string' ? data['eyebrow'] : DEFAULT_HEADER.eyebrow,
      title: typeof data['title'] === 'string' ? data['title'] : DEFAULT_HEADER.title,
      description: typeof data['description'] === 'string' ? data['description'] : DEFAULT_HEADER.description
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
