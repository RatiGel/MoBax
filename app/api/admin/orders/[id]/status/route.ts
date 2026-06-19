import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail, notFound } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { UpdateOrderStatusSchema } from '@/lib/validations';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import { sendEmail } from '@/lib/email/send';
import OrderShipped from '@/lib/email/templates/OrderShipped';
import OrderDelivered from '@/lib/email/templates/OrderDelivered';

/** Best-effort lookup of the email tied to an order (registered user or guest). */
async function resolveOrderEmail(order: {
  userId?: string;
  guestEmail?: string;
}): Promise<string | null> {
  if (order.guestEmail) return order.guestEmail;
  if (order.userId) {
    try {
      const user = await User.findById(order.userId).lean();
      return user?.email ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Statuses that release reserved stock back to inventory.
const STOCK_RESTORING = new Set(['CANCELLED', 'REFUNDED']);

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'orders' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Order not found');

    const json = await req.json();
    const parsed = UpdateOrderStatusSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid status data', 422);
    }
    const { status, trackingNumber, notes } = parsed.data;

    const order = await Order.findById(params.id);
    if (!order) return notFound('Order not found');

    const previousStatus = order.status;

    // Restore stock only on the first transition into a restoring status,
    // i.e. when the order was not already cancelled/refunded.
    const shouldRestoreStock =
      STOCK_RESTORING.has(status) && !STOCK_RESTORING.has(previousStatus);

    if (shouldRestoreStock) {
      await Promise.all(
        order.items.map((item) =>
          Product.updateOne(
            { _id: item.productId },
            { $inc: { stock: item.quantity } }
          )
        )
      );
    }

    order.status = status;
    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
    if (notes !== undefined) order.notes = notes;
    await order.save();

    await logActivity(session, 'order.status', 'Order', params.id, {
      from: previousStatus,
      to: status,
      stockRestored: shouldRestoreStock,
    });

    // Fire-and-forget status emails. Only on a real transition into the status.
    if (status !== previousStatus && (status === 'SHIPPED' || status === 'DELIVERED')) {
      void resolveOrderEmail(order).then((to) => {
        if (!to) return;
        if (status === 'SHIPPED') {
          return sendEmail({
            to,
            subject: `Order ${order.orderNumber} has shipped`,
            react: OrderShipped({
              orderNumber: order.orderNumber,
              trackingNumber: order.trackingNumber,
            }),
          });
        }
        return sendEmail({
          to,
          subject: `Order ${order.orderNumber} delivered`,
          react: OrderDelivered({ orderNumber: order.orderNumber }),
        });
      });
    }

    return ok(order.toObject());
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/orders/:id/status PATCH]', err);
    return fail('Failed to update order status', 500);
  }
}
