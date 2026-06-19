import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import User from '@/models/User';
import Order from '@/models/Order';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin({ module: 'customers' });
    await connectDB();

    const { searchParams } = req.nextUrl;
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));

    const filter: Record<string, unknown> = { role: 'CUSTOMER' };
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ email: rx }, { firstName: rx }, { lastName: rx }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Aggregate order count + total spent per customer in one query.
    const ids = users.map((u) => String(u._id));
    const stats = await Order.aggregate<{ _id: string; orderCount: number; totalSpent: number }>([
      { $match: { userId: { $in: ids } } },
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' },
        },
      },
    ]);
    const statsById = new Map(stats.map((s) => [s._id, s]));

    const customers = users.map((u) => {
      const s = statsById.get(String(u._id));
      return {
        ...u,
        orderCount: s?.orderCount ?? 0,
        totalSpent: s?.totalSpent ?? 0,
      };
    });

    return ok({ customers, total, page, limit });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/customers GET]', err);
    return fail('Failed to load customers', 500);
  }
}
