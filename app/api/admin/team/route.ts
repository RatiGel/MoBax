import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import User, { type UserRole } from '@/models/User';
import Invite from '@/models/Invite';

export const dynamic = 'force-dynamic';

const ADMIN_STAFF_ROLES: UserRole[] = ['SUPER_ADMIN', 'STORE_MANAGER', 'CONTENT_EDITOR'];

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin({ module: 'team' });
    await connectDB();

    const [members, invites] = await Promise.all([
      User.find({ role: { $in: ADMIN_STAFF_ROLES } })
        .select('-passwordHash')
        .sort('-createdAt')
        .lean(),
      Invite.find({ used: false, expiresAt: { $gt: new Date() } })
        .sort('-createdAt')
        .lean(),
    ]);

    return ok({ members, invites });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/team GET]', err);
    return fail('Failed to load team', 500);
  }
}
