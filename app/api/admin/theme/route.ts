import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import Setting, { SETTING_KEYS } from '@/models/Setting';

export const dynamic = 'force-dynamic';

/** GET the saved store theme (color tokens, branding). */
export async function GET() {
  try {
    await requireAdmin({ module: 'theme' });
    await connectDB();
    const setting = await Setting.findOne({ key: SETTING_KEYS.THEME }).lean();
    return ok({ theme: setting?.value ?? {} });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/theme GET]', err);
    return fail('Failed to load theme', 500);
  }
}

/** PATCH the store theme (upsert the THEME setting). */
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin({ module: 'theme' });
    await connectDB();

    const body = await req.json();
    if (!body || typeof body !== 'object') return fail('Invalid theme payload', 422);

    const updated = await Setting.findOneAndUpdate(
      { key: SETTING_KEYS.THEME },
      { $set: { value: body } },
      { upsert: true, new: true }
    ).lean();

    await logActivity(session, 'theme.update', 'Setting', SETTING_KEYS.THEME);
    return ok({ theme: updated?.value ?? body });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/theme PATCH]', err);
    return fail('Failed to save theme', 500);
  }
}
