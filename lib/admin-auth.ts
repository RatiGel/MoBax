import { auth } from '@/auth';
import type { Session } from 'next-auth';
import type { UserRole } from '@/models/User';
import { isAdminRole, canAccessModule, hasRole, type AdminModule } from '@/lib/rbac';

export type AdminSession = Session & { user: { id: string; role: UserRole } };

export class AdminAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Server-side guard for admin API routes. Throws AdminAuthError on failure
 * (catch in route → map to fail(status)). Optionally enforce a module or role list.
 */
export async function requireAdmin(opts?: {
  module?: AdminModule;
  roles?: UserRole[];
}): Promise<AdminSession> {
  const session = await auth();
  const role = session?.user?.role as UserRole | undefined;

  if (!session?.user || !isAdminRole(role)) {
    throw new AdminAuthError('Unauthorized', 401);
  }
  if (opts?.module && !canAccessModule(role, opts.module)) {
    throw new AdminAuthError('Forbidden: insufficient role for this module', 403);
  }
  if (opts?.roles && !hasRole(role, opts.roles)) {
    throw new AdminAuthError('Forbidden: insufficient role', 403);
  }
  return session as AdminSession;
}

/** Non-throwing variant for RSC/layout guards. Returns null if not an admin. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await auth();
  const role = session?.user?.role as UserRole | undefined;
  if (!session?.user || !isAdminRole(role)) return null;
  return session as AdminSession;
}
