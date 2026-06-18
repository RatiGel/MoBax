import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { startOfDay, endOfDay } from '@/lib/date-range';
import Order from '@/models/Order';
import Product from '@/models/Product';

export const dynamic = 'force-dynamic';

const LOW_STOCK_THRESHOLD = 10;
const REVENUE_STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin({ module: 'analytics' });
    await connectDB();

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const [todayAgg, todayOrders, totalProducts, lowStock] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: todayStart, $lte: todayEnd },
            status: { $in: REVENUE_STATUSES },
          },
        },
        { $group: { _id: null, revenue: { $sum: '$total' } } },
      ]),
      Order.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      Product.countDocuments({}),
      Product.countDocuments({ stock: { $lte: LOW_STOCK_THRESHOLD } }),
    ]);

    return ok({
      todayRevenue: todayAgg[0]?.revenue ?? 0,
      todayOrders,
      totalProducts,
      lowStockCount: lowStock,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[analytics/summary]', err);
    return fail('Failed to load summary', 500);
  }
}
