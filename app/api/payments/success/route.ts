import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import { sendEmail } from '@/lib/email/send';
import OrderConfirmation from '@/lib/email/templates/OrderConfirmation';
import { sendTelegramOrderNotification } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

/**
 * Payment provider's browser return target on success. Flitt sends the buyer
 * back to `response_url` as a POST with the transaction fields (order_id, …),
 * while our own `?orderId=` is on the query string — so we accept BOTH methods
 * and read the id from either place. The webhook is authoritative; this handler
 * only optimistically marks the order paid and bounces to the confirmation page.
 */
async function resolveOrderId(req: NextRequest): Promise<string | null> {
  const fromQuery = req.nextUrl.searchParams.get('orderId') || req.nextUrl.searchParams.get('order_id');
  if (fromQuery) return fromQuery;
  // Flitt POSTs the return as application/x-www-form-urlencoded.
  try {
    const form = await req.formData();
    const v = form.get('order_id') ?? form.get('orderId');
    return typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}

async function handle(req: NextRequest) {
  const orderId = await resolveOrderId(req);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

  // Forward the buyer's email so a guest lands straight on the confirmation
  // (the order lookup needs it — a logged-in owner is matched by session).
  let guestEmail = '';
  if (orderId) {
    try {
      await connectDB();
      // The matched-but-modified count tells us THIS request is the one that
      // flipped the order to PAID — so the confirmation email is sent exactly
      // once even if Flitt returns twice (e.g. GET + POST, or a retry).
      const res = await Order.updateOne(
        { _id: orderId, paymentStatus: { $ne: 'PAID' } },
        { $set: { paymentStatus: 'PAID', status: 'PROCESSING' } }
      );
      const justPaid = res.modifiedCount > 0;

      const order = await Order.findById(orderId).lean();
      guestEmail = (order?.guestEmail as string) || '';

      if (justPaid && order) {
        const customerEmail = (order.guestEmail as string) || (order.addressSnapshot?.email as string) || '';
        if (customerEmail) {
          const trackParams = new URLSearchParams({ paid: '1' });
          if (guestEmail) trackParams.set('email', guestEmail);
          void sendEmail({
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
        }

        // Notify the team on Telegram — same once-per-order justPaid guard as
        // the email above, so a duplicate Flitt return won't double-send.
        const first = (order.addressSnapshot?.firstName as string) || '';
        const last = (order.addressSnapshot?.lastName as string) || '';
        const items = (order.items as { quantity: number }[]) || [];
        void sendTelegramOrderNotification({
          orderNumber: order.orderNumber as string,
          customerName: `${first} ${last}`.trim() || 'Unknown',
          total: order.total as number,
          itemCount: items.reduce((n, it) => n + (it.quantity || 0), 0),
          adminUrl: `${origin}/admin/orders/${orderId}`,
        });
      }
    } catch (err) {
      console.error('[payments/success]', err);
    }
  }

  const params = new URLSearchParams({ paid: '1' });
  if (guestEmail) params.set('email', guestEmail);
  const target = orderId
    ? `${origin}/en/orders/${orderId}?${params.toString()}`
    : `${origin}/en`;
  // 303 so the browser switches a POST return into a GET on the confirmation page.
  return NextResponse.redirect(target, 303);
}

export const GET = handle;
export const POST = handle;
