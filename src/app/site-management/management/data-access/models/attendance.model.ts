import { ApiResponseDto, EmployeeProfileResponse } from './profile.model';

export interface CheckInRequest {
  faceDescriptor: number[];
}

export type CheckInResponse = ApiResponseDto<EmployeeProfileResponse>;
