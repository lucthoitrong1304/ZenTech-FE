import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideCalendar,
  LucideCamera,
  LucideLoader2,
  LucideMail,
  LucideMapPin,
  LucidePhone,
  LucideShield,
  LucideUser,
} from '@lucide/angular';
import { AuthStorageService } from '../../../../core/services/auth-storage.service';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { AdminProfileUpdateRequest } from '../../data-access/models/admin-profile.model';
import { AdminProfileStore } from '../../data-access/store/admin-profile.store';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideArrowLeft,
    LucideCalendar,
    LucideCamera,
    LucideLoader2,
    LucideMail,
    LucideMapPin,
    LucidePhone,
    LucideShield,
    LucideUser,
  ],
  templateUrl: './admin-profile.component.html',
  styleUrl: './admin-profile.component.css',
})
export class AdminProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authSessionStore = inject(AuthSessionStore);
  private readonly authStorageService = inject(AuthStorageService);
  protected readonly adminProfileStore = inject(AdminProfileStore);
  protected readonly currentUser = this.authSessionStore.currentUser;

  protected readonly profileForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required]],
    phoneNumber: [''],
    address: [''],
    dateOfBirth: [''],
  });

  protected readonly avatarUrl = computed(() => {
    return this.adminProfileStore.profile()?.imageUrl || this.currentUser()?.avatarUrl || null;
  });

  protected readonly displayName = computed(() => {
    const profileName = this.adminProfileStore.profile()?.fullName?.trim();
    const sessionName = this.currentUser()?.fullName?.trim();
    const fullName = profileName || sessionName;

    if (!fullName) return 'ZenTech Admin';
    if (fullName.includes('@')) return fullName.split('@')[0];
    return fullName;
  });

  protected readonly adminEmail = computed(() => {
    return this.adminProfileStore.profile()?.email || this.authStorageService.getSession()?.email || '';
  });

  protected readonly accountInitials = computed(() => {
    let name = this.displayName().trim();
    if (!name) return 'AD';
    if (name.includes('@')) name = name.split('@')[0];

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  });

  constructor() {
    effect(() => {
      const profile = this.adminProfileStore.profile();
      if (!profile) return;

      this.profileForm.patchValue({
        fullName: profile.fullName || '',
        phoneNumber: profile.phoneNumber || '',
        address: profile.address || '',
        dateOfBirth: profile.dateOfBirth || '',
      });
    });
  }

  ngOnInit(): void {
    this.adminProfileStore.loadProfile();
  }

  protected triggerFileInput(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.adminProfileStore.uploadAvatar(file);
    input.value = '';
  }

  protected onSubmit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const value = this.profileForm.getRawValue();
    const payload: AdminProfileUpdateRequest = {
      fullName: value.fullName.trim(),
      phoneNumber: value.phoneNumber.trim() || null,
      address: value.address.trim() || null,
      dateOfBirth: value.dateOfBirth || null,
      imageUrl: null,
    };

    this.adminProfileStore.updateProfile(payload);
  }
}
