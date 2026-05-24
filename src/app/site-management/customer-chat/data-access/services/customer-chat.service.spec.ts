import '@angular/compiler';
import { HttpContext, HttpHeaders } from '@angular/common/http';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../../../core/api/api.service';
import { SKIP_AUTH_TOKEN, SKIP_GLOBAL_ERROR } from '../../../../core/tokens/api-context.token';
import { environment } from '../../../../../environments/environment';
import { ChatAttachmentType, UploadPresignResponse } from '../models/customer-chat.models';
import { CustomerChatService } from './customer-chat.service';

describe('CustomerChatService', () => {
  const uploadsUrl = `${environment.apiBaseUrl}/uploads`;

  beforeAll(() => {
    try {
      getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('already been initialized')) {
        throw error;
      }
    }
  });

  function configureService(api: object): CustomerChatService {
    TestBed.configureTestingModule({
      providers: [
        CustomerChatService,
        {
          provide: ApiService,
          useValue: api,
        },
      ],
    });

    return TestBed.inject(CustomerChatService);
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('uploads chat attachments with direct presign response and required R2 headers', async () => {
    const presign: UploadPresignResponse = {
      presignedUrl: 'https://r2.example.com/upload',
      fileKey: 'uploads/chat/conversation-1/video.mp4',
      method: 'PUT',
      expiresInMinutes: 15,
      requiredHeaders: { 'Content-Type': 'video/mp4' },
    };
    const post = vi.fn(() => of(presign));
    const putFile = vi.fn(() => of(''));
    const service = configureService({ post, putFile });
    const file = new File(['video'], 'Screen Recording.mp4', { type: 'video/mp4' });

    const result = await firstValueFrom(service.uploadFile(file));

    expect(post).toHaveBeenCalledWith(`${uploadsUrl}/presign`, {
      originalFilename: 'Screen Recording.mp4',
      contentType: 'video/mp4',
      fileSize: file.size,
      purpose: 'CHAT_ATTACHMENT',
    });
    expect(putFile).toHaveBeenCalledWith(
      presign.presignedUrl,
      file,
      expect.objectContaining({
        headers: expect.any(HttpHeaders),
        context: expect.any(HttpContext),
      })
    );

    const putOptions = putFile.mock.calls[0][2] as {
      headers: HttpHeaders;
      context: HttpContext;
    };
    expect(putOptions.headers.get('Content-Type')).toBe('video/mp4');
    expect(putOptions.context.get(SKIP_AUTH_TOKEN)).toBe(true);
    expect(putOptions.context.get(SKIP_GLOBAL_ERROR)).toBe(true);
    expect(result).toEqual({
      fileKey: presign.fileKey,
      fileName: 'Screen Recording.mp4',
      contentType: 'video/mp4',
      fileSize: file.size,
      attachmentType: ChatAttachmentType.VIDEO,
    });
  });

  it('falls back to octet-stream and FILE attachment type when the browser omits mime type', async () => {
    const presign: UploadPresignResponse = {
      presignedUrl: 'https://r2.example.com/upload',
      fileKey: 'uploads/chat/conversation-1/archive.bin',
      method: 'PUT',
      expiresInMinutes: 15,
      requiredHeaders: { 'Content-Type': 'application/octet-stream' },
    };
    const post = vi.fn(() => of(presign));
    const putFile = vi.fn(() => of(''));
    const service = configureService({ post, putFile });
    const file = new File(['raw'], 'archive.bin');

    const result = await firstValueFrom(service.uploadFile(file));

    expect(post).toHaveBeenCalledWith(`${uploadsUrl}/presign`, {
      originalFilename: 'archive.bin',
      contentType: 'application/octet-stream',
      fileSize: file.size,
      purpose: 'CHAT_ATTACHMENT',
    });
    expect(result.contentType).toBe('application/octet-stream');
    expect(result.attachmentType).toBe(ChatAttachmentType.FILE);
  });
});
