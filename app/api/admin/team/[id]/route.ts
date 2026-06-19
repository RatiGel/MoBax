import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail, notFound } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { UpdateRoleSchema } from '@/lib/validations';
import User, { type UserRole } from '@/models/User';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

const ADMIN_STAFF_ROLES: UserRole[] = ['SUPER_ADMIN', 'STORE_MANAGER', 'CONTENT_EDITOR'];

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'team' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Member not found');

    const json = await req.json();
    const parsed = UpdateRoleSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid role', 422);
    }
    const { role: nextRole } = parsed.data;

    const member = await User.findOne({ _id: params.id, role: { $in: ADMIN_STAFF_ROLES } }).lean();
    if (!member) return notFound('Member not found');

    // Guard: never let the last SUPER_ADMIN be demoted.
    if (member.role === 'SUPER_ADMIN' && nextRole !== 'SUPER_ADMIN') {
      const superAdmins = await User.countDocuments({ role: 'SUPER_ADMIN' });
      if (superAdmins <= 1) {
        return fail('Cannot demote the last super admin', 409);
      }
    }

    const updated = await User.findByIdAndUpdate(
      params.id,
      { $set: { role: nextRole } },
      { new: true, runValidators: true }
    )
      .select('-passwordHash')
      .lean();
    if (!updated) return notFound('Member not found');

    await logActivity(session, 'team.updateRole', 'User', params.id, {
      from: member.role,
      to: nextRole,
    });

    return ok(updated);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/team/:id PATCH]', err);
    return fail('Failed to update member', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'team' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Member not found');

    const member = await User.findOne({ _id: params.id, role: { $in: ADMIN_STAFF_ROLES } }).lean();
    if (!member) return notFound('Member not found');

    // Guard: never remove the last SUPER_ADMIN.
    if (member.role === 'SUPER_ADMIN') {
      const superAdmins = await User.countDocuments({ role: 'SUPER_ADMIN' });
      if (superAdmins <= 1) {
        return fail('Cannot remove the last super admin', 409);
      }
    }

    // "Remove from team" = demote to CUSTOMER rather than delete the account.
    const updated = await User.findByIdAndUpdate(
      params.id,
      { $set: { role: 'CUSTOMER' } },
      { new: true }
    )
      .select('-passwordHash')
      .lean();
    if (!updated) return notFound('Member not found');

    await logActivity(session, 'team.remove', 'User', params.id, { previousRole: member.role });

    return ok({ id: params.id, removed: true });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/team/:id DELETE]', err);
    return fail('Failed to remove member', 500);
  }
}
