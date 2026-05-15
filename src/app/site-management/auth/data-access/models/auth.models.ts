import { Role } from './auth.enums';

// Payload đăng nhập gửi email và mật khẩu lên backend.
export interface LoginRequest {
  email: string;
  password: string;
}

// Payload gửi idToken của Google lên backend
export interface GoogleLoginRequest {
  token: string;
}

// Payload đăng ký đầy đủ gửi backend, bao gồm vai trò tài khoản.
export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}

// Payload form đăng ký khách hàng ở FE, service sẽ tự gán role CUSTOMER.
export type RegisterCustomerPayload = Omit<RegisterRequest, 'role'>;

// Response backend trả về sau đăng nhập hoặc làm mới token.
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  type: string;
  accountId: string;
  profileId: string;
  email: string;
  fullName: string;
  roles: string[];
  expiresIn?: number;
}

// Dữ liệu phiên đăng nhập FE lưu để duy trì trạng thái người dùng.
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  accountId: string;
  profileId: string;
  email: string;
  fullName: string;
  roles: string[];
  expiresIn?: number;
}

// Payload gửi refresh token cho các API refresh-token hoặc logout.
export interface TokenRefreshRequest {
  refreshToken: string;
}

// Payload gửi email để yêu cầu backend tạo link khôi phục mật khẩu.
export interface ForgotPasswordRequest {
  email: string;
}

// Payload gửi token reset và mật khẩu mới để đặt lại mật khẩu.
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
