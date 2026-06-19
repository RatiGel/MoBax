import { NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { InviteSchema } from '@/lib/validations';
import User from '@/models/User';
import Invite from '@/models/Invite';

export const dynamic = 'force-dynamic';

const INVITE_TTL_MS = 7 * 86400000; // 7 days

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin({ module: 'team' });
    await connectDB();

    const json = await req.json();
    const parsed = InviteSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid invite data', 422);
    }
    const email = parsed.data.email.toLowerCase().trim();
    const { role } = parsed.data;

    // Guard: don't invite an email that already has an account.
    const existing = await User.exists({ email });
    if (existing) return fail('A user with this email already exists', 409);

    // Replace any outstanding unused invite for the same email.
    await Invite.deleteMany({ email, used: false });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const invite = await Invite.create({
      email,
      role,
      token,
      invitedBy: session.user.id,
      expiresAt,
    });

    await logActivity(session, 'team.invite', 'Invite', String(invite._id), { email, role });

    return ok(
      {
        invite: invite.toObject(),
        inviteLink: `/register?invite=${token}`,
      },
      201
    );
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/team/invite POST]', err);
    return fail('Failed to create invite', 500);
  }
}
