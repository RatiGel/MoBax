import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { UpdateSettingsSchema } from '@/lib/validations';
import Setting from '@/models/Setting';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin({ module: 'settings' });
    await connectDB();

    const docs = await Setting.find({}).lean();
    const settings = docs.reduce<Record<string, unknown>>((acc, d) => {
      acc[d.key] = d.value;
      return acc;
    }, {});

    return ok({ settings });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/settings GET]', err);
    return fail('Failed to load settings', 500);
  }
}

async function applyUpdate(req: NextRequest) {
  const session = await requireAdmin({ module: 'settings' });
  await connectDB();

  const json = await req.json();
  const parsed = UpdateSettingsSchema.safeParse(json);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid settings data', 422);
  }

  const entries = Object.entries(parsed.data);
  await Promise.all(
    entries.map(([key, value]) =>
      Setting.findOneAndUpdate(
        { key },
        { $set: { value } },
        { upsert: true, new: true }
      )
    )
  );

  await logActivity(session, 'settings.update', 'Setting', undefined, {
    keys: entries.map(([k]) => k),
  });

  // Return the full, fresh settings map so the client can resync.
  const docs = await Setting.find({}).lean();
  const settings = docs.reduce<Record<string, unknown>>((acc, d) => {
    acc[d.key] = d.value;
    return acc;
  }, {});

  return ok({ settings });
}

export async function PATCH(req: NextRequest) {
  try {
    return await applyUpdate(req);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/settings PATCH]', err);
    return fail('Failed to update settings', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    return await applyUpdate(req);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/settings PUT]', err);
    return fail('Failed to update settings', 500);
  }
}
