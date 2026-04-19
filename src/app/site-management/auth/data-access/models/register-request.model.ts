import { Role } from './auth-role.enum';

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}

export type RegisterCustomerPayload = Omit<RegisterRequest, 'role'>;
