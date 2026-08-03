import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { revalidateStorefront } from '@/lib/revalidate';
import Setting, { SETTING_KEYS } from '@/models/Setting';

export const dynamic = 'force-dynamic';

/** Copies theme_draft over the live theme setting and revalidates the storefront. */
export async function POST() {
  try {
    const session = await requireAdmin({ module: 'theme' });
    await connectDB();

    const draft = await Setting.findOne({ key: SETTING_KEYS.THEME_DRAFT }).lean();
    if (!draft?.value || typeof draft.value !== 'object') {
      return fail('No draft to publish', 422);
    }

    const updated = await Setting.findOneAndUpdate(
      { key: SETTING_KEYS.THEME },
      { $set: { value: draft.value } },
      { upsert: true, new: true }
    ).lean();

    await logActivity(session, 'theme.publish', 'Setting', SETTING_KEYS.THEME);
    revalidateStorefront('theme');

    return ok({ theme: updated?.value ?? draft.value });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/theme/publish POST]', err);
    return fail('Failed to publish theme', 500);
  }
}
