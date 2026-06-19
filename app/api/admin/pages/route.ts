import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import Page, { type PageKey } from '@/models/Page';

export const dynamic = 'force-dynamic';

// The full set of pages the CMS manages. The list endpoint returns one entry
// per known key, falling back to an empty stub for pages not yet created in DB.
const PAGE_KEYS: PageKey[] = ['home', 'about', 'faq', 'contact', 'privacy', 'terms'];

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin({ module: 'content' });
    await connectDB();

    const existing = await Page.find({}).lean();
    const byKey = new Map(existing.map((p) => [p.pageKey, p]));

    const pages = PAGE_KEYS.map((pageKey) => {
      const p = byKey.get(pageKey);
      return {
        pageKey,
        sections: p?.sections ?? [],
        seo: p?.seo ?? { title: '', description: '' },
        updatedAt: p?.updatedAt ?? null,
        exists: !!p,
      };
    });

    return ok({ pages, total: pages.length });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/pages GET]', err);
    return fail('Failed to load pages', 500);
  }
}
