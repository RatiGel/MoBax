import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import Setting, { SETTING_KEYS } from '@/models/Setting';

export const dynamic = 'force-dynamic';

/** GET the saved theme draft (falls back to {} when none has been saved yet). */
export async function GET() {
  try {
    await requireAdmin({ module: 'theme' });
    await connectDB();
    const setting = await Setting.findOne({ key: SETTING_KEYS.THEME_DRAFT }).lean();
    return ok({ draft: setting?.value ?? null });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/theme/draft GET]', err);
    return fail('Failed to load theme draft', 500);
  }
}

/** PATCH (upsert) the theme_draft setting. Does not touch the live theme. */
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin({ module: 'theme' });
    await connectDB();

    const body = await req.json();
    if (!body || typeof body !== 'object') return fail('Invalid theme payload', 422);

    const updated = await Setting.findOneAndUpdate(
      { key: SETTING_KEYS.THEME_DRAFT },
      { $set: { value: body } },
      { upsert: true, new: true }
    ).lean();

    await logActivity(session, 'theme.draft_save', 'Setting', SETTING_KEYS.THEME_DRAFT);
    return ok({ draft: updated?.value ?? body });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/theme/draft PATCH]', err);
    return fail('Failed to save theme draft', 500);
  }
}
