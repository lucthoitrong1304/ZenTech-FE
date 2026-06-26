import { HttpContext, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { ApiService } from '../../../../core/api/api.service';
import { SKIP_AUTH_TOKEN, SKIP_GLOBAL_ERROR } from '../../../../core/tokens/api-context.token';
import { environment } from '../../../../../environments/environment';

export interface UploadPresignRequestDto {
  originalFilename: string;
  contentType: string;
  fileSize: number;
  purpose: 'PRODUCT_REVIEW' | 'PRODUCT_REVIEW_VIDEO';
}

export interface UploadPresignResponseDto {
  presignedUrl: string;
  fileKey: string;
  method: 'PUT' | string;
  expiresInMinutes: number;
  requiredHeaders: Record<string, string>;
}

@Injectable({
  providedIn: 'root',
})
export class ReviewMediaUploadService {
  private readonly apiService = inject(ApiService);
  private readonly uploadsBaseUrl = `${environment.apiBaseUrl}/uploads`;

  // Upload ảnh đánh giá lên R2 và trả về fileKey để lưu cùng review.
  uploadReviewImage(file: File): Observable<string> {
    return this.requestPresignedUrl(file, 'PRODUCT_REVIEW').pipe(
      switchMap(presign => this.uploadToR2(file, presign).pipe(map(() => presign.fileKey)))
    );
  }

  // Upload video đánh giá lên R2 và trả về fileKey để backend gắn vào review.
  uploadReviewVideo(file: File): Observable<string> {
    return this.requestPresignedUrl(file, 'PRODUCT_REVIEW_VIDEO').pipe(
      switchMap(presign => this.uploadToR2(file, presign).pipe(map(() => presign.fileKey)))
    );
  }

  // Gọi backend để tạo presigned URL theo đúng loại media cần upload.
  private requestPresignedUrl(
    file: File,
    purpose: 'PRODUCT_REVIEW' | 'PRODUCT_REVIEW_VIDEO'
  ): Observable<UploadPresignResponseDto> {
    return this.apiService.post<UploadPresignRequestDto, UploadPresignResponseDto>(
      `${this.uploadsBaseUrl}/presign`,
      {
        originalFilename: file.name,
        contentType: file.type,
        fileSize: file.size,
        purpose,
      }
    );
  }

  // Đẩy file trực tiếp lên R2 bằng URL tạm thời, không gửi kèm JWT của hệ thống.
  uploadToR2(file: File, presign: UploadPresignResponseDto): Observable<string> {
    return this.apiService.putFile(presign.presignedUrl, file, {
      headers: new HttpHeaders(presign.requiredHeaders),
      context: new HttpContext().set(SKIP_AUTH_TOKEN, true).set(SKIP_GLOBAL_ERROR, true),
    });
  }
}
