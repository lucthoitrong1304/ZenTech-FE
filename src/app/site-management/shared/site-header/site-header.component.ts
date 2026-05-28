import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideChevronDown,
  LucideCircleUserRound,
  LucideLogIn,
  LucideLogOut,
  LucideMenu,
  LucideSearch,
  LucideSettings,
  LucideShoppingCart,
  LucideUserPlus
} from '@lucide/angular';
import { PopoverModule } from 'primeng/popover';
import { HeaderNavItem } from '../site-navigation.models';

export interface HeaderUser {
  isAuthenticated: boolean;
  fullName?: string;
  avatarUrl?: string | null;
}

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PopoverModule,
    LucideMenu,
    LucideSearch,
    LucideShoppingCart,
    LucideCircleUserRound,
    LucideChevronDown,
    LucideLogIn,
    LucideUserPlus,
    LucideSettings,
    LucideLogOut
  ],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.css'
})
export class SiteHeaderComponent {
  readonly navItems = input<HeaderNavItem[]>([]);
  readonly activeNavLabel = input<string | null>(null);
  readonly cartCount = input(0);
  readonly currentUser = input<HeaderUser | null>(null);
  readonly navSelect = output<HeaderNavItem>();
  readonly logout = output<void>();

  readonly isAuthenticated = computed(() => this.currentUser()?.isAuthenticated === true);
  readonly hasAvatar = computed(() => !!this.currentUser()?.avatarUrl);
  readonly shouldShowInitials = computed(() => this.isAuthenticated() && !this.hasAvatar());
  readonly accountInitials = computed(() => {
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

  readonly accountTriggerLabel = computed(() => {
    if (!this.isAuthenticated()) {
      return 'Tài khoản';
    }

    return this.currentUser()?.fullName || 'Quản lý tài khoản';
  });

  isActive(item: HeaderNavItem): boolean {
    return this.activeNavLabel() === item.label;
  }

  onNavSelect(item: HeaderNavItem): void {
    this.navSelect.emit(item);
  }

  onLogout(): void {
    this.logout.emit();
  }

  trackByLabel(_: number, item: HeaderNavItem): string {
    return item.slug;
  }
}
