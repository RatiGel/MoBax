import ActivityLog from '@/models/ActivityLog';
import type { AdminSession } from '@/lib/admin-auth';

/**
 * Record an admin action. Fire-and-forget safe: never throws into the caller
 * (a logging failure must not break the mutation it accompanies).
 */
export async function logActivity(
  session: AdminSession,
  action: string,
  entityType: string,
  entityId?: string,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    await ActivityLog.create({
      userId: session.user.id,
      userName: session.user.name ?? session.user.email ?? 'admin',
      action,
      entityType,
      entityId,
      meta,
    });
  } catch (err) {
    console.error('[activity] failed to log', action, err);
  }
}
