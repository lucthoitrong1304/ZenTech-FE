import { HttpContext, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/api/api.service';
import { SKIP_AUTH_TOKEN, SKIP_GLOBAL_ERROR } from '../../../../core/tokens/api-context.token';
import { environment } from '../../../../../environments/environment';
import {
  AdminApiResponseDto,
  AdminProfileResponse,
  AdminProfileUpdateRequest,
  AdminUploadPresignRequestDto,
  AdminUploadPresignResponseDto,
  AdminUploadPurpose,
} from '../models/admin-profile.model';

@Injectable({ providedIn: 'root' })
export class AdminProfileService {
  private readonly apiService = inject(ApiService);
  private readonly profileUrl = `${environment.apiBaseUrl}/employees/me/profile`;
  private readonly uploadPresignUrl = `${environment.apiBaseUrl}/uploads/presign`;

  getProfile(): Observable<AdminApiResponseDto<AdminProfileResponse>> {
    return this.apiService.get<AdminApiResponseDto<AdminProfileResponse>>(this.profileUrl);
  }

  updateProfile(
    payload: AdminProfileUpdateRequest
  ): Observable<AdminApiResponseDto<AdminProfileResponse>> {
    return this.apiService.put<AdminProfileUpdateRequest, AdminApiResponseDto<AdminProfileResponse>>(
      this.profileUrl,
      payload
    );
  }

  requestAvatarUploadPresign(file: File): Observable<AdminUploadPresignResponseDto> {
    const payload: AdminUploadPresignRequestDto = {
      originalFilename: file.name,
      contentType: file.type,
      fileSize: file.size,
      purpose: AdminUploadPurpose.EmployeeAvatar,
    };

    return this.apiService.post<AdminUploadPresignRequestDto, AdminUploadPresignResponseDto>(
      this.uploadPresignUrl,
      payload
    );
  }

  uploadToR2(presign: AdminUploadPresignResponseDto, file: File): Observable<string> {
    return this.apiService.putFile(presign.presignedUrl, file, {
      headers: new HttpHeaders(presign.requiredHeaders),
      context: new HttpContext().set(SKIP_AUTH_TOKEN, true).set(SKIP_GLOBAL_ERROR, true),
    });
  }
}
