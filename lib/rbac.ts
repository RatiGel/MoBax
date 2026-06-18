import type { UserRole } from '@/models/User';

/** Admin modules used for nav filtering + route guards. */
export type AdminModule =
  | 'analytics'
  | 'products'
  | 'categories'
  | 'orders'
  | 'customers'
  | 'pricing'
  | 'theme'
  | 'content'
  | 'settings'
  | 'team';

/** Which modules each role may access. */
export const ROLE_MODULES: Record<UserRole, AdminModule[]> = {
  SUPER_ADMIN: [
    'analytics', 'products', 'categories', 'orders', 'customers',
    'pricing', 'theme', 'content', 'settings', 'team',
  ],
  STORE_MANAGER: [
    'analytics', 'products', 'categories', 'orders', 'customers', 'pricing',
  ],
  CONTENT_EDITOR: ['content', 'theme'],
  CUSTOMER: [],
};

export const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'STORE_MANAGER', 'CONTENT_EDITOR'];

export function isAdminRole(role?: UserRole | null): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

export function canAccessModule(role: UserRole | undefined | null, mod: AdminModule): boolean {
  if (!role) return false;
  return ROLE_MODULES[role]?.includes(mod) ?? false;
}

/** Returns true if role is in the allowed list. */
export function hasRole(role: UserRole | undefined | null, allowed: UserRole[]): boolean {
  return !!role && allowed.includes(role);
}
