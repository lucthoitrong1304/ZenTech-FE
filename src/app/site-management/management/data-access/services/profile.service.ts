import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import { EmployeeProfileResponse, EmployeeProfileUpdateRequest, ApiResponseDto } from '../models/profile.model';
import { HttpContext, HttpHeaders } from '@angular/common/http';
import { SKIP_AUTH_TOKEN, SKIP_GLOBAL_ERROR } from '../../../../core/tokens/api-context.token';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/employees/me/profile`;

  getMyProfile(): Observable<ApiResponseDto<EmployeeProfileResponse>> {
    return this.apiService.get<ApiResponseDto<EmployeeProfileResponse>>(this.baseUrl);
  }

  updateMyProfile(payload: EmployeeProfileUpdateRequest): Observable<ApiResponseDto<EmployeeProfileResponse>> {
    return this.apiService.put<EmployeeProfileUpdateRequest, ApiResponseDto<EmployeeProfileResponse>>(this.baseUrl, payload);
  }

  registerFace(faceDescriptors: number[][]): Observable<ApiResponseDto<void>> {
    return this.apiService.post<{ faceDescriptors: number[][] }, ApiResponseDto<void>>(`${environment.apiBaseUrl}/employees/me/face`, {
      faceDescriptors,
    });
  }

  requestAvatarUploadPresign(file: File): Observable<any> {
    const payload = {
      originalFilename: file.name,
      contentType: file.type,
      fileSize: file.size,
      purpose: 'EMPLOYEE_AVATAR',
    };
    return this.apiService.post<any, any>(`${environment.apiBaseUrl}/uploads/presign`, payload);
  }

  uploadToR2(presign: any, file: File): Observable<string> {
    return this.apiService.putFile(presign.presignedUrl, file, {
      headers: new HttpHeaders(presign.requiredHeaders),
      context: new HttpContext().set(SKIP_AUTH_TOKEN, true).set(SKIP_GLOBAL_ERROR, true),
    });
  }
}
