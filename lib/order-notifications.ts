import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import { sendEmail } from '@/lib/email/send';
import OrderConfirmation from '@/lib/email/templates/OrderConfirmation';
import { sendTelegramOrderNotification } from '@/lib/telegram';

/**
 * Paid-order notifications — the customer's confirmation email and the team's
 * Telegram message.
 *
 * Two independent requests can mark an order paid: the Flitt webhook (the
 * authoritative one) and the buyer's browser return to /api/payments/success.
 * Flitt's server callback normally lands FIRST, so notifications must not hang
 * off either handler alone — that shipped as a real bug where the webhook set
 * PAID, the browser return then found nothing to update, and neither path sent
 * anything.
 *
 * So both handlers call this, and the once-only guard is an atomic claim on
 * `paidNotifiedAt` rather than on `paymentStatus`. Whoever wins the claim
 * sends; the loser no-ops. Never throws — callers fire-and-forget with `void`.
 */
export async function notifyOrderPaid(orderId: string, origin: string): Promise<void> {
  try {
    await connectDB();

    // Atomic claim: only the request that transitions paidNotifiedAt from
    // unset to now() proceeds. findOneAndUpdate is a single atomic op, so a
    // concurrent webhook + browser return cannot both win.
    const order = await Order.findOneAndUpdate(
      { _id: orderId, paidNotifiedAt: { $exists: false } },
      { $set: { paidNotifiedAt: new Date() } },
      { new: true }
    ).lean();

    if (!order) return; // Already notified, or no such order.

    const customerEmail =
      (order.guestEmail as string) || (order.addressSnapshot?.email as string) || '';

    if (customerEmail) {
      const trackParams = new URLSearchParams({ paid: '1' });
      if (order.guestEmail) trackParams.set('email', order.guestEmail as string);
      await sendEmail({
        to: customerEmail,
        subject: `Order ${order.orderNumber} confirmed`,
        react: OrderConfirmation({
          orderNumber: order.orderNumber as string,
          customerName: (order.addressSnapshot?.firstName as string) || 'there',
          items: order.items as { nameSnapshot: string; quantity: number; priceSnapshot: number }[],
          subtotal: order.subtotal as number,
          shippingCost: order.shippingCost as number,
          total: order.total as number,
          deliveryMethod: order.deliveryMethod as 'pickup' | 'instant' | 'nextday' | 'regional',
          trackUrl: `${origin}/en/orders/${orderId}?${trackParams.toString()}`,
        }),
      });
    } else {
      console.warn(`[order-notifications] order ${orderId} has no customer email; skipping confirmation`);
    }

    const first = (order.addressSnapshot?.firstName as string) || '';
    const last = (order.addressSnapshot?.lastName as string) || '';
    const items = (order.items as { quantity: number }[]) || [];
    await sendTelegramOrderNotification({
      orderNumber: order.orderNumber as string,
      customerName: `${first} ${last}`.trim() || 'Unknown',
      total: order.total as number,
      itemCount: items.reduce((n, it) => n + (it.quantity || 0), 0),
      adminUrl: `${origin}/admin/orders/${orderId}`,
    });
  } catch (err) {
    // Releasing the claim on failure would let a webhook retry double-send, so
    // a failed send stays failed and loud. sendEmail/sendTelegram already
    // swallow their own transport errors, so reaching here means a DB or
    // render fault.
    console.error(`[order-notifications] failed for order ${orderId}:`, err);
  }
}
