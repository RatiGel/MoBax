import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { OrderStatusSchema } from '@/lib/validations';
import Order from '@/models/Order';
import Product from '@/models/Product';

export const dynamic = 'force-dynamic';

const BulkSchema = z.object({
  ids: z.array(z.string()).min(1, 'Select at least one order'),
  status: OrderStatusSchema,
});

/** Bulk-update order status. Restores stock for orders newly moved to CANCELLED/REFUNDED. */
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin({ module: 'orders' });
    await connectDB();

    const parsed = BulkSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid request', 422);
    }
    const { ids, status } = parsed.data;

    const restocking = status === 'CANCELLED' || status === 'REFUNDED';
    if (restocking) {
      // Only restock orders not already cancelled/refunded, to avoid double-restore.
      const toRestock = await Order.find({
        _id: { $in: ids },
        status: { $nin: ['CANCELLED', 'REFUNDED'] },
      }).lean();
      for (const order of toRestock) {
        await Promise.all(
          (order.items ?? []).map((item) =>
            Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } })
          )
        );
      }
    }

    const res = await Order.updateMany({ _id: { $in: ids } }, { $set: { status } });

    await logActivity(session, 'order.bulkStatus', 'Order', undefined, {
      count: res.modifiedCount,
      status,
    });

    return ok({ updated: res.modifiedCount, status });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/orders/bulk]', err);
    return fail('Failed to update orders', 500);
  }
}
