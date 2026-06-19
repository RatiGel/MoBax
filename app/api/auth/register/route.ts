import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { RegisterSchema } from '@/lib/validations';
import { sendEmail } from '@/lib/email/send';
import Welcome from '@/lib/email/templates/Welcome';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message ?? 'Validation error' },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, password } = parsed.data;

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({ firstName, lastName, email, passwordHash });

    // Fire-and-forget welcome email. Never block or fail registration.
    void sendEmail({
      to: user.email,
      subject: 'Welcome to MoBax',
      react: Welcome({ firstName: user.firstName }),
    });

    return NextResponse.json(
      {
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
