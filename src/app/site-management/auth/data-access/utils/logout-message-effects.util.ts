import { effect, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../../../shared/components/toast/toast.service';

interface LogoutMessageStore {
  logoutSuccessMessage: () => string | null;
  logoutWarningMessage: () => string | null;
  clearLogoutMessages: () => void;
}

// Đăng ký effect hiển thị thông báo đăng xuất và điều hướng về trang chủ.
export function setupLogoutMessageEffects(
  authSessionStore: LogoutMessageStore,
  toastService: ToastService,
  router: Router,
): void {
  effect(() => {
    const message = authSessionStore.logoutSuccessMessage();

    if (message) {
      untracked(() => {
        toastService.success(message);
        authSessionStore.clearLogoutMessages();
        router.navigate(['/']);
      });
    }
  });

  effect(() => {
    const message = authSessionStore.logoutWarningMessage();

    if (message) {
      untracked(() => {
        toastService.warning(message);
        authSessionStore.clearLogoutMessages();
        router.navigate(['/']);
      });
    }
  });
}
