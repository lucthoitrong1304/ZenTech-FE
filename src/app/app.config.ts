import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { IconRegistryService } from './shared/services/icon-registry.service';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { GlobalErrorHandler } from './core/errors/global-error-handler';
import { tokenInterceptor } from './core/interceptors/token.interceptor';

import { routes } from './app.routes';
import { provideStore } from '@ngrx/store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([tokenInterceptor, errorInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideAppInitializer(() => {
        const iconRegistry = inject(IconRegistryService);
        return iconRegistry.registerIcons();
    }),
    provideStore()
],
};
