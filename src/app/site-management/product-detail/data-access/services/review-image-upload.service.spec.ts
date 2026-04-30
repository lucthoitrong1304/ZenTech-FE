import { HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import { ReviewImageUploadService, UploadPresignResponseDto } from './review-image-upload.service';

describe('ReviewImageUploadService', () => {
  const uploadsUrl = `${environment.apiBaseUrl}/uploads`;

  function configureService(api: object): ReviewImageUploadService {
    TestBed.configureTestingModule({
      providers: [
        ReviewImageUploadService,
        {
          provide: ApiService,
          useValue: api,
        },
      ],
    });

    return TestBed.inject(ReviewImageUploadService);
  }

  it('requests a product review presigned upload URL with file metadata', async () => {
    const post = vi.fn(() =>
      of({
        presignedUrl: 'https://r2.example.com/upload',
        fileKey: 'uploads/reviews/user-1/image.webp',
        method: 'PUT',
        expiresInMinutes: 10,
        requiredHeaders: { 'Content-Type': 'image/webp' },
      })
    );
    const service = configureService({ post });
    const file = new File(['image'], 'image.webp', { type: 'image/webp' });

    const response = await firstValueFrom(service.requestReviewImageUpload(file));

    expect(post).toHaveBeenCalledWith(`${uploadsUrl}/presign`, {
      originalFilename: 'image.webp',
      contentType: 'image/webp',
      fileSize: file.size,
      purpose: 'PRODUCT_REVIEW',
    });
    expect(response.fileKey).toBe('uploads/reviews/user-1/image.webp');
  });

  it('uploads the file to R2 with required presigned headers', async () => {
    const putFile = vi.fn(() => of(''));
    const service = configureService({ putFile });
    const file = new File(['image'], 'image.png', { type: 'image/png' });
    const presign: UploadPresignResponseDto = {
      presignedUrl: 'https://r2.example.com/upload',
      fileKey: 'uploads/reviews/user-1/image.png',
      method: 'PUT',
      expiresInMinutes: 10,
      requiredHeaders: { 'Content-Type': 'image/png' },
    };

    await firstValueFrom(service.uploadToR2(file, presign));

    expect(putFile).toHaveBeenCalledWith(
      presign.presignedUrl,
      file,
      expect.objectContaining({
        headers: expect.any(HttpHeaders),
      })
    );
  });
});
