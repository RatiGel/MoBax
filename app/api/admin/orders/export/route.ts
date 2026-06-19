import { NextRequest } from 'next/server';
import Papa from 'papaparse';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { startOfDay, endOfDay } from '@/lib/date-range';
import Order from '@/models/Order';
import type { IOrder } from '@/models/Order';

export const dynamic = 'force-dynamic';

/** CSV export of orders, honoring the same filters as the admin list. */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin({ module: 'orders' });
    await connectDB();

    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const search = searchParams.get('search')?.trim();
    const from = searchParams.get('from');
    const to = searchParams.get('to');

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

    const orders = await Order.find(filter).sort('-createdAt').limit(5000).lean<IOrder[]>();

    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      date: o.createdAt ? new Date(o.createdAt).toISOString() : '',
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      customer: o.guestEmail || o.userId || '',
      city: o.addressSnapshot?.city ?? '',
      items: o.items?.reduce((n, i) => n + i.quantity, 0) ?? 0,
      subtotal: o.subtotal,
      shipping: o.shippingCost,
      total: o.total,
      tracking: o.trackingNumber ?? '',
    }));

    const csv = Papa.unparse(rows);

    await logActivity(session, 'order.export', 'Order', undefined, { count: rows.length });

    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="orders-${stamp}.csv"`,
      },
    });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/orders/export]', err);
    return fail('Failed to export orders', 500);
  }
}
