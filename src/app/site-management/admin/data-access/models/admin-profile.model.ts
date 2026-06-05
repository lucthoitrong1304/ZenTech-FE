import { Role } from '../../../auth/data-access/models/auth.enums';

export enum AdminUploadPurpose {
  EmployeeAvatar = 'EMPLOYEE_AVATAR',
}

export interface AdminApiResponseDto<T> {
  success: boolean;
  message: string | null;
  data: T;
  timestamp?: string;
}

export interface AdminProfileResponse {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  imageUrl: string | null;
  phoneNumber: string | null;
  address: string | null;
  dateOfBirth: string | null;
  isActive: boolean;
  hasRegisteredFace: boolean;
}

export interface AdminProfileUpdateRequest {
  fullName: string;
  phoneNumber: string | null;
  address: string | null;
  dateOfBirth: string | null;
  imageUrl: string | null;
}

export interface AdminUploadPresignRequestDto {
  originalFilename: string;
  contentType: string;
  fileSize: number;
  purpose: AdminUploadPurpose;
}

export interface AdminUploadPresignResponseDto {
  presignedUrl: string;
  fileKey: string;
  method: 'PUT' | string;
  expiresInMinutes: number;
  requiredHeaders: Record<string, string>;
}
