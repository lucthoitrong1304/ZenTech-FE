import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
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
import { MatMenuModule } from '@angular/material/menu';

export interface HeaderNavItem {
  label: string;
  link?: string;
}

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
    MatMenuModule,
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

  get isAuthenticated(): boolean {
    return this.currentUser()?.isAuthenticated === true;
  }

  get hasAvatar(): boolean {
    return !!this.currentUser()?.avatarUrl;
  }

  get shouldShowInitials(): boolean {
    return this.isAuthenticated && !this.hasAvatar;
  }

  get accountInitials(): string {
    const fullName = this.currentUser()?.fullName?.trim();

    if (!fullName) {
      return 'ZT';
    }

    return fullName
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  }

  get accountTriggerLabel(): string {
    if (!this.isAuthenticated) {
      return 'Tai khoan';
    }

    return this.currentUser()?.fullName || 'Quan ly tai khoan';
  }

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
    return item.label;
  }
}
