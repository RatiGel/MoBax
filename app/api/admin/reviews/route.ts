import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import Review from '@/models/Review';

export const dynamic = 'force-dynamic';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin({ module: 'products' });
    await connectDB();

    const { searchParams } = req.nextUrl;
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status'); // pending | approved | all
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));

    const filter: Record<string, unknown> = {};
    if (status === 'pending') filter.isApproved = false;
    else if (status === 'approved') filter.isApproved = true;
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ productSlug: rx }, { userName: rx }, { title: rx }, { body: rx }];
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    return ok({ reviews, total, page, limit });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/reviews GET]', err);
    return fail('Failed to load reviews', 500);
  }
}
