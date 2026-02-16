import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { IconRegistryService } from './shared/services/icon-registry.service';

import { routes } from './app.routes';

export function initializeIcons(iconRegistry: IconRegistryService) {
  return () => iconRegistry.registerIcons();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeIcons,
      deps: [IconRegistryService],
      multi: true
    }
  ]
};
