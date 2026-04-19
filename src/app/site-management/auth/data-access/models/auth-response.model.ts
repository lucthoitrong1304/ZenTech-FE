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
