import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ClientLogEventType } from './client-log.model';
import { ClientLogService } from './client-log.service';

@Injectable({ providedIn: 'root' })
export class RouteClientLogService {
  private readonly router = inject(Router);
  private readonly clientLogService = inject(ClientLogService);
  private initialized = false;

  initialize(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.clientLogService.info(
          ClientLogEventType.RouteNavigated,
          `Người dùng điều hướng tới ${event.urlAfterRedirects}.`,
          {
            routeUrl: event.urlAfterRedirects,
          },
        );
      });
  }
}
