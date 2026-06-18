import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { parseDateRange } from '@/lib/date-range';
import Order from '@/models/Order';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin({ module: 'analytics' });
    await connectDB();

    const { from, to } = parseDateRange(req.nextUrl.searchParams);

    // Orders grouped by status (donut)
    const byStatusAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } },
    ]);

    // New vs returning customers over time:
    // For each order in range, mark whether it's the customer's first-ever order.
    const newVsReturning = await Order.aggregate([
      { $match: { userId: { $ne: null } } },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: '$userId',
          firstOrderAt: { $first: '$createdAt' },
          orders: {
            $push: { createdAt: '$createdAt' },
          },
        },
      },
      { $unwind: '$orders' },
      { $match: { 'orders.createdAt': { $gte: from, $lte: to } } },
      {
        $project: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$orders.createdAt' } },
          isNew: { $eq: ['$orders.createdAt', '$firstOrderAt'] },
        },
      },
      {
        $group: {
          _id: '$day',
          newCustomers: { $sum: { $cond: ['$isNew', 1, 0] } },
          returningCustomers: { $sum: { $cond: ['$isNew', 0, 1] } },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, period: '$_id', newCustomers: 1, returningCustomers: 1 } },
    ]);

    return ok({ byStatus: byStatusAgg, newVsReturning });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[analytics/orders]', err);
    return fail('Failed to load order analytics', 500);
  }
}
