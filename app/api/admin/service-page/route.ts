import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { UpdateServicePageSchema } from '@/lib/validations';
import ServicePage from '@/models/ServicePage';

export const dynamic = 'force-dynamic';

const EMPTY = {
  key: 'services' as const,
  headingEn: '',
  headingKa: '',
  introEn: '',
  introKa: '',
  mapEmbedUrl: '',
  addressEn: '',
  addressKa: '',
};

export async function GET() {
  try {
    await requireAdmin({ module: 'content' });
    await connectDB();
    const doc = await ServicePage.findOne({ key: 'services' }).lean();
    return ok(doc ?? EMPTY);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/service-page GET]', err);
    return fail('Failed to load service page', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAdmin({ module: 'content' });
    await connectDB();
    const json = await req.json();
    const parsed = UpdateServicePageSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid page data', 422);
    }
    const doc = await ServicePage.findOneAndUpdate(
      { key: 'services' },
      { $set: { ...parsed.data, key: 'services', updatedBy: session.user.id } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    await logActivity(session, 'servicePage.update', 'ServicePage', 'services', {});
    return ok(doc);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/service-page PUT]', err);
    return fail('Failed to save service page', 500);
  }
}
