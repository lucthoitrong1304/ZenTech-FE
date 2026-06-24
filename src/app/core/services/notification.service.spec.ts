import '@angular/compiler';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { ApiService } from '../api/api.service';
import { IPageResponse, INotification, IUnreadCountResponse, NotificationType } from '../models/notification.model';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  const baseUrl = `${environment.apiBaseUrl}/notifications`;

  beforeAll(() => {
    try {
      getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch (error) {
      if (!(error instanceof Error) || !isTestEnvironmentAlreadyInitialized(error)) {
        throw error;
      }
    }
  });

  function configureService(api: object): NotificationService {
    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        {
          provide: ApiService,
          useValue: api,
        },
      ],
    });

    return TestBed.inject(NotificationService);
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('loads the first notification page from the configured API base URL', async () => {
    const response: IPageResponse<INotification> = {
      content: [
        {
          id: 'notification-1',
          title: 'New message',
          content: 'You have a new message',
          isRead: false,
          type: NotificationType.CHAT_MESSAGE,
          referenceId: 'conversation-1',
          createdAt: '2026-06-24T10:00:00Z',
        },
      ],
      pageNumber: 0,
      pageSize: 20,
      totalElements: 1,
      totalPages: 1,
      last: true,
    };
    const get = vi.fn(() => of(response));
    const service = configureService({ get });

    await expect(firstValueFrom(service.getNotifications())).resolves.toEqual(response);
    expect(get).toHaveBeenCalledWith(baseUrl, { params: { page: 0, size: 20 } });
  });

  it('loads the unread count as JSON from the configured API base URL', async () => {
    const response: IUnreadCountResponse = { count: 3 };
    const get = vi.fn(() => of(response));
    const service = configureService({ get });

    await expect(firstValueFrom(service.getUnreadCount())).resolves.toEqual(response);
    expect(get).toHaveBeenCalledWith(`${baseUrl}/unread-count`);
  });

  it('marks one notification as read with a void PUT request', async () => {
    const put = vi.fn(() => of(undefined));
    const service = configureService({ put });

    await expect(firstValueFrom(service.markAsRead('notification-1'))).resolves.toBeUndefined();
    expect(put).toHaveBeenCalledWith(`${baseUrl}/notification-1/read`, undefined);
  });

  it('marks all notifications as read with a void PUT request', async () => {
    const put = vi.fn(() => of(undefined));
    const service = configureService({ put });

    await expect(firstValueFrom(service.markAllAsRead())).resolves.toBeUndefined();
    expect(put).toHaveBeenCalledWith(`${baseUrl}/read-all`, undefined);
  });
});

function isTestEnvironmentAlreadyInitialized(error: Error): boolean {
  return (
    error.message.includes('already been initialized') ||
    error.message.includes('already been called')
  );
}
