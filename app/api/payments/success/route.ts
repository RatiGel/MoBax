import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import { notifyOrderPaid } from '@/lib/order-notifications';

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
      // Optimistically mark paid if the webhook hasn't already. Status matches
      // the webhook's CONFIRMED — the two handlers race, so they must agree on
      // the resulting status or it depends on who wins.
      await Order.updateOne(
        { _id: orderId, paymentStatus: { $ne: 'PAID' } },
        { $set: { paymentStatus: 'PAID', status: 'CONFIRMED' } }
      );

      const order = await Order.findById(orderId).lean();
      guestEmail = (order?.guestEmail as string) || '';

      // Unconditional: notifyOrderPaid owns the once-only guard via its atomic
      // claim on paidNotifiedAt. Gating here on "did I win the status update"
      // was the original bug — the webhook usually flips PAID first, so this
      // path found nothing modified and silently sent nothing.
      await notifyOrderPaid(orderId, origin);
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
