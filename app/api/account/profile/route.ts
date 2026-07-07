import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { UpdateProfileSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

function serialize(user: {
  firstName: string;
  lastName: string;
  email: string;
  address?: unknown;
  passwordHash?: string;
}) {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    address: user.address ?? null,
    hasPassword: !!user.passwordHash,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in' }, { status: 401 });
  }
  await connectDB();
  const user = await User.findById(session.user.id)
    .select('firstName lastName email address passwordHash')
    .lean();
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(serialize(user));
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 400 }
    );
  }

  await connectDB();

  const update: Record<string, unknown> = {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
  };
  // address: object → set; null → clear; undefined → leave unchanged.
  if (parsed.data.address === null) update.address = undefined;
  else if (parsed.data.address) update.address = parsed.data.address;

  const user = await User.findByIdAndUpdate(session.user.id, update, {
    new: true,
    runValidators: true,
  })
    .select('firstName lastName email address passwordHash')
    .lean();
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(serialize(user));
}
