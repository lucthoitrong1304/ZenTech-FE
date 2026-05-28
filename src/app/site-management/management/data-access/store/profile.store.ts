import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap, map } from 'rxjs';
import { EmployeeProfileResponse, EmployeeProfileUpdateRequest } from '../models/profile.model';
import { ProfileService } from '../services/profile.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';

interface ProfileState {
  profile: EmployeeProfileResponse | null;
  isLoading: boolean;
  isSaving: boolean;
}

const initialState: ProfileState = {
  profile: null,
  isLoading: false,
  isSaving: false,
};

export const ProfileStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ profile }) => ({
    hasProfile: computed(() => !!profile()),
  })),
  withMethods(
    (
      store,
      profileService = inject(ProfileService),
      toastService = inject(ToastService),
      authSessionStore = inject(AuthSessionStore)
    ) => ({
      loadProfile: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { isLoading: true })),
          switchMap(() =>
            profileService.getMyProfile().pipe(
              tap(response => {
                if (response.success && response.data) {
                  patchState(store, { profile: response.data, isLoading: false });
                } else {
                  patchState(store, { isLoading: false });
                }
              }),
              catchError(() => {
                patchState(store, { isLoading: false });
                return EMPTY;
              })
            )
          )
        )
      ),
      updateProfile: rxMethod<EmployeeProfileUpdateRequest>(
        pipe(
          tap(() => patchState(store, { isSaving: true })),
          switchMap(request =>
            profileService.updateMyProfile(request).pipe(
              tap(response => {
                if (response.success && response.data) {
                  patchState(store, { profile: response.data, isSaving: false });
                  authSessionStore.updateCurrentUserProfile(response.data.fullName, response.data.imageUrl);
                  toastService.success('Cập nhật hồ sơ thành công');
                } else {
                  patchState(store, { isSaving: false });
                  toastService.error(response.message || 'Cập nhật thất bại');
                }
              }),
              catchError(() => {
                patchState(store, { isSaving: false });
                return EMPTY;
              })
            )
          )
        )
      ),
      uploadAvatar: rxMethod<File>(
        pipe(
          tap(() => patchState(store, { isSaving: true })),
          switchMap(file =>
            profileService.requestAvatarUploadPresign(file).pipe(
              switchMap(presign => profileService.uploadToR2(presign, file).pipe(
                map(() => presign.fileKey)
              )),
              switchMap(fileKey => {
                const currentProfile = store.profile();
                if (!currentProfile) return EMPTY;
                const payload: EmployeeProfileUpdateRequest = {
                  fullName: currentProfile.fullName,
                  phoneNumber: currentProfile.phoneNumber,
                  address: currentProfile.address,
                  dateOfBirth: currentProfile.dateOfBirth,
                  imageUrl: fileKey
                };
                return profileService.updateMyProfile(payload).pipe(
                  tap(response => {
                    if (response.success && response.data) {
                      patchState(store, { profile: response.data, isSaving: false });
                      authSessionStore.updateCurrentUserProfile(response.data.fullName, response.data.imageUrl);
                      toastService.success('Cập nhật ảnh đại diện thành công');
                    } else {
                      patchState(store, { isSaving: false });
                      toastService.error(response.message || 'Cập nhật thất bại');
                    }
                  })
                );
              }),
              catchError(() => {
                patchState(store, { isSaving: false });
                toastService.error('Không thể cập nhật ảnh đại diện');
                return EMPTY;
              })
            )
          )
        )
      ),
    })
  )
);
