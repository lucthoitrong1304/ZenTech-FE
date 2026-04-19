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
