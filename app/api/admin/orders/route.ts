import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { startOfDay, endOfDay } from '@/lib/date-range';
import Order from '@/models/Order';

export const dynamic = 'force-dynamic';

const SORT_MAP: Record<string, string> = {
  newest: '-createdAt',
  oldest: 'createdAt',
  total: 'total',
  orderNumber: 'orderNumber',
};

export async function GET(req: NextRequest) {
  try {
    await requireAdmin({ module: 'orders' });
    await connectDB();

    const { searchParams } = req.nextUrl;
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status'); // OrderStatus | all
    const paymentStatus = searchParams.get('paymentStatus'); // PaymentStatus | all
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const sortKey = searchParams.get('sort') || 'newest';
    const dir = searchParams.get('dir') === 'asc' ? '' : '-';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));

    const filter: Record<string, unknown> = {};
    if (status && status !== 'all') filter.status = status;
    if (paymentStatus && paymentStatus !== 'all') filter.paymentStatus = paymentStatus;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ orderNumber: rx }, { guestEmail: rx }];
    }
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = startOfDay(new Date(from));
      if (to) range.$lte = endOfDay(new Date(to));
      filter.createdAt = range;
    }

    // Build sort. Named presets keep their sign; column keys honor dir.
    const base = SORT_MAP[sortKey] ?? SORT_MAP.newest;
    const sortObj =
      sortKey in SORT_MAP && !base.startsWith('-') ? `${dir}${base}` : base;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return ok({ orders, total, page, limit });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/orders GET]', err);
    return fail('Failed to load orders', 500);
  }
}
