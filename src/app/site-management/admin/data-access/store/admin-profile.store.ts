import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, map, pipe, switchMap, tap } from 'rxjs';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { AdminProfileResponse, AdminProfileUpdateRequest } from '../models/admin-profile.model';
import { AdminProfileService } from '../services/admin-profile.service';

interface AdminProfileState {
  profile: AdminProfileResponse | null;
  isLoading: boolean;
  isSaving: boolean;
}

const initialState: AdminProfileState = {
  profile: null,
  isLoading: false,
  isSaving: false,
};

export const AdminProfileStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ profile }) => ({
    hasProfile: computed(() => profile() !== null),
  })),
  withMethods(
    (
      store,
      adminProfileService = inject(AdminProfileService),
      toastService = inject(ToastService),
      authSessionStore = inject(AuthSessionStore)
    ) => ({
      loadProfile: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { isLoading: true })),
          switchMap(() =>
            adminProfileService.getProfile().pipe(
              tap(response => {
                if (response.success && response.data) {
                  patchState(store, { profile: response.data, isLoading: false });
                  authSessionStore.updateCurrentUserProfile(
                    response.data.fullName,
                    response.data.imageUrl
                  );
                  return;
                }

                patchState(store, { isLoading: false });
              }),
              catchError(() => {
                patchState(store, { isLoading: false });
                return EMPTY;
              })
            )
          )
        )
      ),
      updateProfile: rxMethod<AdminProfileUpdateRequest>(
        pipe(
          tap(() => patchState(store, { isSaving: true })),
          switchMap(request =>
            adminProfileService.updateProfile(request).pipe(
              tap(response => {
                if (response.success && response.data) {
                  patchState(store, { profile: response.data, isSaving: false });
                  authSessionStore.updateCurrentUserProfile(
                    response.data.fullName,
                    response.data.imageUrl
                  );
                  toastService.success('Cập nhật hồ sơ admin thành công');
                  return;
                }

                patchState(store, { isSaving: false });
                toastService.error(response.message || 'Cập nhật hồ sơ admin thất bại');
              }),
              catchError(() => {
                patchState(store, { isSaving: false });
                toastService.error('Không thể cập nhật hồ sơ admin');
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
            adminProfileService.requestAvatarUploadPresign(file).pipe(
              switchMap(presign =>
                adminProfileService.uploadToR2(presign, file).pipe(map(() => presign.fileKey))
              ),
              switchMap(fileKey => {
                const currentProfile = store.profile();
                if (!currentProfile) {
                  patchState(store, { isSaving: false });
                  toastService.error('Chưa tải được hồ sơ admin');
                  return EMPTY;
                }

                const payload: AdminProfileUpdateRequest = {
                  fullName: currentProfile.fullName,
                  phoneNumber: currentProfile.phoneNumber,
                  address: currentProfile.address,
                  dateOfBirth: currentProfile.dateOfBirth,
                  imageUrl: fileKey,
                };

                return adminProfileService.updateProfile(payload).pipe(
                  tap(response => {
                    if (response.success && response.data) {
                      patchState(store, { profile: response.data, isSaving: false });
                      authSessionStore.updateCurrentUserProfile(
                        response.data.fullName,
                        response.data.imageUrl
                      );
                      toastService.success('Cập nhật ảnh đại diện admin thành công');
                      return;
                    }

                    patchState(store, { isSaving: false });
                    toastService.error(response.message || 'Cập nhật ảnh đại diện thất bại');
                  })
                );
              }),
              catchError(() => {
                patchState(store, { isSaving: false });
                toastService.error('Không thể cập nhật ảnh đại diện admin');
                return EMPTY;
              })
            )
          )
        )
      ),
    })
  )
);
