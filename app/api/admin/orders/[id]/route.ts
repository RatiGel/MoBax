import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail, notFound } from '@/lib/api';
import Order from '@/models/Order';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin({ module: 'orders' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Order not found');

    const order = await Order.findById(params.id).lean();
    if (!order) return notFound('Order not found');
    return ok(order);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/orders/:id GET]', err);
    return fail('Failed to load order', 500);
  }
}
