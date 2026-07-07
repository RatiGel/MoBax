import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { ChangePasswordSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = ChangePasswordSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 400 }
    );
  }

  await connectDB();
  const user = await User.findById(session.user.id).select('passwordHash');
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Google-only accounts have no password to change.
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: 'This account signs in with Google and has no password.' },
      { status: 400 }
    );
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
  }

  user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await user.save();

  return NextResponse.json({ ok: true });
}
