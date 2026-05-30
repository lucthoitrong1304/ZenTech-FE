import { Role } from '../../../auth/data-access/models/auth.enums';

export interface ApiResponseDto<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface EmployeeProfileResponse {
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

export interface EmployeeProfileUpdateRequest {
  fullName: string;
  phoneNumber: string | null;
  address: string | null;
  dateOfBirth: string | null;
  imageUrl: string | null;
}
