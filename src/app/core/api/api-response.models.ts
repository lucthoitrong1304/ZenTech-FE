export interface ApiResponseDto<T> {
  success: boolean;
  data: T;
  message: string | null;
}

export interface PageResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
