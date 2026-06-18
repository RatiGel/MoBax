import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { parseDateRange } from '@/lib/date-range';
import Order from '@/models/Order';

export const dynamic = 'force-dynamic';

const REVENUE_STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

export async function GET(req: NextRequest) {
  try {
    await requireAdmin({ module: 'analytics' });
    await connectDB();

    const { from, to } = parseDateRange(req.nextUrl.searchParams);
    const granularity = req.nextUrl.searchParams.get('granularity') || 'daily';
    const fmt = granularity === 'monthly' ? '%Y-%m' : granularity === 'weekly' ? '%G-W%V' : '%Y-%m-%d';

    const data = await Order.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to }, status: { $in: REVENUE_STATUSES } } },
      {
        $group: {
          _id: { $dateToString: { format: fmt, date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, period: '$_id', revenue: 1, orders: 1 } },
    ]);

    return ok(data);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[analytics/revenue]', err);
    return fail('Failed to load revenue', 500);
  }
}
