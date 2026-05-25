import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
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

