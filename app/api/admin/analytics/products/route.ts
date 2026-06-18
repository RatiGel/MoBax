import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { parseDateRange } from '@/lib/date-range';
import Order from '@/models/Order';
import Product from '@/models/Product';

export const dynamic = 'force-dynamic';

const LOW_STOCK_THRESHOLD = 10;
const REVENUE_STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

export async function GET(req: NextRequest) {
  try {
    await requireAdmin({ module: 'analytics' });
    await connectDB();

    const { from, to } = parseDateRange(req.nextUrl.searchParams);

    // Top 10 selling products by units sold within range.
    // Order items store nameSnapshot + productId, so we can read name directly.
    const topProducts = await Order.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to }, status: { $in: REVENUE_STATUSES } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.nameSnapshot' },
          unitsSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.priceSnapshot', '$items.quantity'] } },
        },
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, productId: '$_id', name: 1, unitsSold: 1, revenue: 1 } },
    ]);

    // Low-stock products table
    const lowStock = await Product.find({ stock: { $lte: LOW_STOCK_THRESHOLD } })
      .select('nameEn sku stock')
      .sort({ stock: 1 })
      .limit(50)
      .lean();

    return ok({
      topProducts,
      lowStock: lowStock.map((p) => ({
        id: String(p._id),
        name: p.nameEn,
        sku: p.sku,
        stock: p.stock,
      })),
    });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[analytics/products]', err);
    return fail('Failed to load product analytics', 500);
  }
}
