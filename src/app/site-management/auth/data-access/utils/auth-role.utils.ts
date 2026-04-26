import { Role } from '../models/auth.enums';

const ROLE_PREFIX = 'ROLE_';

export function normalizeRole(role: string): string {
  return role.startsWith(ROLE_PREFIX) ? role.slice(ROLE_PREFIX.length) : role;
}

export function hasRole(roles: string[], role: Role): boolean {
  return roles.some(currentRole => normalizeRole(currentRole) === role);
}
