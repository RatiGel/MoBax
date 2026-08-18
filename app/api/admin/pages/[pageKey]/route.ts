import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { revalidateStorefront } from '@/lib/revalidate';
import { PageKeySchema, UpdatePageSchema } from '@/lib/validations';
import { validateSection } from '@/lib/page-sections';
import Page from '@/models/Page';

export const dynamic = 'force-dynamic';

type Params = { params: { pageKey: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin({ module: 'content' });
    await connectDB();

    const keyParsed = PageKeySchema.safeParse(params.pageKey);
    if (!keyParsed.success) return fail('Unknown page', 404);
    const pageKey = keyParsed.data;

    const page = await Page.findOne({ pageKey }).lean();

    // Create-on-read default: return an empty page shell if it doesn't exist yet
    // so the editor always has something to render and save.
    if (!page) {
      return ok({
        pageKey,
        sections: [],
        seo: { title: '', description: '' },
        exists: false,
      });
    }

    return ok({ ...page, exists: true });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/pages/:pageKey GET]', err);
    return fail('Failed to load page', 500);
  }
}

async function upsertPage(req: NextRequest, { params }: Params) {
  const session = await requireAdmin({ module: 'content' });
  await connectDB();

  const keyParsed = PageKeySchema.safeParse(params.pageKey);
  if (!keyParsed.success) return fail('Unknown page', 404);
  const pageKey = keyParsed.data;

  const json = await req.json();
  const parsed = UpdatePageSchema.safeParse(json);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid page data', 422);
  }

  // Schema-level parsing above only checks shape (type is a known enum,
  // content is present). It doesn't know per-kind required fields — that's
  // `validateSection`, the same check the client runs. Abort on the first
  // invalid section, matching the shape-validation error style above.
  for (let i = 0; i < parsed.data.sections.length; i++) {
    const section = parsed.data.sections[i];
    const result = validateSection(section.type, section.content);
    if (!result.ok) {
      return fail(`Section ${i + 1}: ${result.errors[0]}`, 422);
    }
  }

  const page = await Page.findOneAndUpdate(
    { pageKey },
    { $set: { ...parsed.data, updatedBy: session.user.id } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();

  await logActivity(session, 'page.update', 'Page', pageKey, {
    sections: parsed.data.sections.length,
  });

  // Storefront pages are ISR at 60s; without this a content edit takes up to a
  // minute to show. Same treatment catalog and settings writes already get.
  revalidateStorefront('content');

  return ok({ ...page, exists: true });
}

export async function PUT(req: NextRequest, ctx: Params) {
  try {
    return await upsertPage(req, ctx);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/pages/:pageKey PUT]', err);
    return fail('Failed to save page', 500);
  }
}

// PATCH is an alias for PUT here: the editor always sends the full page document.
export async function PATCH(req: NextRequest, ctx: Params) {
  try {
    return await upsertPage(req, ctx);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/pages/:pageKey PATCH]', err);
    return fail('Failed to save page', 500);
  }
}
