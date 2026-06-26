import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import {
  LucideChevronRight,
  LucideMapPin,
  LucidePencil,
  LucideWallet,
  LucideUpload,
} from '@lucide/angular';
import { AccountStore } from '../../data-access/store/account.store';

@Component({
  selector: 'app-account-overview-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    DialogModule,
    LucideWallet,
    LucideChevronRight,
    LucideMapPin,
    LucidePencil,
    LucideUpload,
  ],
  templateUrl: './account-overview-page.component.html',
})
export class AccountOverviewPageComponent {
  protected readonly accountStore = inject(AccountStore);
  
  protected isEditProfileOpen = false;
  protected editFullName = '';

  protected orderStatusLabel(status: string): string {
    const normalized = status.toUpperCase();
    switch (normalized) {
      case 'CREATED':
        return 'Mới tạo';
      case 'PENDING':
        return 'Chờ thanh toán';
      case 'PROCESSING':
        return 'Đang xử lý';
      case 'SHIPPED':
        return 'Đang giao hàng';
      case 'DELIVERED':
        return 'Đã giao hàng';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status;
    }
  }

  protected statusClass(status: string): string {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
      case 'processing':
        return 'bg-[#ffdf94] text-[#6e5400]';
      case 'cancelled':
        return 'bg-[#ffdad6] text-[#93000a]';
      case 'delivered':
        return 'bg-[#d8f5dd] text-[#166534]';
      case 'shipped':
      default:
        return 'bg-[#e2dfff] text-[#3323cc]';
    }
  }

  protected openEditProfile(): void {
    const profile = this.accountStore.profile();
    if (profile) {
      this.editFullName = profile.fullName;
      this.isEditProfileOpen = true;
    }
  }

  protected saveProfile(): void {
    if (!this.editFullName.trim()) {
      return;
    }
    const profile = this.accountStore.profile();
    this.accountStore.updateProfile({
      fullName: this.editFullName,
      imageUrl: profile?.imageUrl,
    });
    this.isEditProfileOpen = false;
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.accountStore.uploadAvatar({ file });
    }
  }
}

