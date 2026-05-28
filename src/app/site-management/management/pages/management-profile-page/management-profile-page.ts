import { Component, effect, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfileStore } from '../../data-access/store/profile.store';
import { LucideUser, LucideMail, LucideShield, LucidePhone, LucideMapPin, LucideCalendar, LucideCamera, LucideLoader2 } from '@lucide/angular';
import { EmployeeProfileUpdateRequest } from '../../data-access/models/profile.model';
import { Role } from '../../../auth/data-access/models/auth.enums';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { AuthStorageService } from '../../../../core/services/auth-storage.service';

@Component({
  selector: 'app-management-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideUser, LucideMail, LucideShield, LucidePhone, LucideMapPin, LucideCalendar, LucideCamera, LucideLoader2],
  templateUrl: './management-profile-page.html',
  styleUrl: './management-profile-page.css',
})
export class ManagementProfilePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authSessionStore = inject(AuthSessionStore);
  private readonly authStorageService = inject(AuthStorageService);
  readonly profileStore = inject(ProfileStore);

  readonly RoleEnum = Role;

  protected readonly currentUser = this.authSessionStore.currentUser;

  profileForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required]],
    phoneNumber: [''],
    address: [''],
    dateOfBirth: [''],
    imageUrl: ['']
  });

  constructor() {
    effect(() => {
      const profile = this.profileStore.profile();
      if (profile) {
        this.profileForm.patchValue({
          fullName: profile.fullName || '',
          phoneNumber: profile.phoneNumber || '',
          address: profile.address || '',
          dateOfBirth: profile.dateOfBirth || '',
          imageUrl: profile.imageUrl || ''
        });
      }
    });
  }

  ngOnInit() {
    this.profileStore.loadProfile();
  }

  onSubmit() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const payload: EmployeeProfileUpdateRequest = this.profileForm.value;
    this.profileStore.updateProfile(payload);
  }

  triggerFileInput(fileInput: HTMLInputElement) {
    fileInput.click();
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.profileStore.uploadAvatar(file);
    }
  }

  protected readonly currentUserEmail = computed(() => {
    return this.authStorageService.getSession()?.email || '';
  });

  protected readonly accountRole = computed(() => {
    const roles = this.currentUser()?.roles || [];
    if (roles.includes('ROLE_OWNER')) return 'OWNER';
    if (roles.includes('ROLE_MANAGER')) return 'MANAGER';
    if (roles.includes('ROLE_EMPLOYEE')) return 'EMPLOYEE';
    return 'MANAGEMENT';
  });

  protected readonly accountInitials = computed(() => {
    let name = this.currentUser()?.fullName?.trim();
    if (!name) return 'ZT';
    if (name.includes('@')) name = name.split('@')[0];
    
    return name.split(/\s+/).slice(0, 2).map((part: string) => part.charAt(0).toUpperCase()).join('');
  });

  protected readonly displayName = computed(() => {
    const profileName = this.profileStore.profile()?.fullName?.trim();
    const sessionName = this.currentUser()?.fullName?.trim();
    const fullName = profileName || sessionName;
    
    if (!fullName) return 'ZenTech User';
    if (fullName.includes('@')) {
      return fullName.split('@')[0];
    }
    return fullName;
  });
}
