import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail, notFound } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { UpdateCustomerSchema } from '@/lib/validations';
import User from '@/models/User';
import Order from '@/models/Order';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin({ module: 'customers' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Customer not found');

    const customer = await User.findOne({ _id: params.id, role: 'CUSTOMER' })
      .select('-passwordHash')
      .lean();
    if (!customer) return notFound('Customer not found');

    const orders = await Order.find({ userId: params.id })
      .sort('-createdAt')
      .limit(50)
      .lean();

    const orderCount = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);

    return ok({ customer, orders, orderCount, totalSpent });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/customers/:id GET]', err);
    return fail('Failed to load customer', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'customers' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Customer not found');

    const json = await req.json();
    const parsed = UpdateCustomerSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid customer data', 422);
    }

    // Only allow toggling isBlocked, and only on CUSTOMER accounts.
    const customer = await User.findOneAndUpdate(
      { _id: params.id, role: 'CUSTOMER' },
      { $set: { isBlocked: parsed.data.isBlocked } },
      { new: true, runValidators: true }
    )
      .select('-passwordHash')
      .lean();
    if (!customer) return notFound('Customer not found');

    await logActivity(
      session,
      parsed.data.isBlocked ? 'customer.block' : 'customer.unblock',
      'User',
      params.id,
      { isBlocked: parsed.data.isBlocked }
    );

    return ok(customer);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/customers/:id PATCH]', err);
    return fail('Failed to update customer', 500);
  }
}
