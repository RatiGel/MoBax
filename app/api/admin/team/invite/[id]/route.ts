import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail, notFound } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import Invite from '@/models/Invite';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'team' });
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound('Invite not found');

    const invite = await Invite.findByIdAndDelete(params.id).lean();
    if (!invite) return notFound('Invite not found');

    await logActivity(session, 'team.revokeInvite', 'Invite', params.id, {
      email: invite.email,
    });

    return ok({ id: params.id, revoked: true });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/team/invite/:id DELETE]', err);
    return fail('Failed to revoke invite', 500);
  }
}
