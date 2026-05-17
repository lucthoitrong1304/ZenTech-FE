import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  importProvidersFrom,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { GlobalErrorHandler } from './core/errors/global-error-handler';
import { tokenInterceptor } from './core/interceptors/token.interceptor';
import Aura from '@primeuix/themes/aura';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { provideMarkdown } from 'ngx-markdown';

// IMPORT THƯ VIỆN BẢN 2.4.0
import {
  SocialLoginModule,
  SocialAuthServiceConfig,
  GoogleLoginProvider,
} from '@abacritt/angularx-social-login';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
      },
    }),
    provideMarkdown(),
    provideHttpClient(withInterceptors([tokenInterceptor, errorInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    ConfirmationService,
    MessageService,

    // --- CẤU HÌNH GOOGLE CHUẨN CHO BẢN 2.4.0 ---
    importProvidersFrom(SocialLoginModule),
    {
      provide: 'SocialAuthServiceConfig', // BẮT BUỘC CÓ DẤU NHÁY ĐƠN
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(
              '172722848021-38o0a01f8t8lhpug43i6fa93f4c4daau.apps.googleusercontent.com',
            ),
          },
        ],
        onError: (err) => {
          console.error('Lỗi Google Login:', err);
        },
      } as SocialAuthServiceConfig,
    },
  ],
};
