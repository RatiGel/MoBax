import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import Media, { MEDIA_FOLDERS, type MediaFolder } from '@/models/Media';

export const dynamic = 'force-dynamic';

function isMediaFolder(value: unknown): value is MediaFolder {
  return typeof value === 'string' && (MEDIA_FOLDERS as readonly string[]).includes(value);
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin({ module: 'media' });
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit')) || 40));
    const search = searchParams.get('search')?.trim();
    const folder = searchParams.get('folder');

    const filter: Record<string, unknown> = {};
    if (folder && isMediaFolder(folder)) {
      filter.folder = folder;
    }
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ alt: rx }, { publicId: rx }];
    }

    const [items, total] = await Promise.all([
      Media.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Media.countDocuments(filter),
    ]);

    return ok({ items, total });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/media GET]', err);
    return fail('Failed to load media', 500);
  }
}
