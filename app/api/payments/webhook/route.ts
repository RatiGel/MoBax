import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import { verifyFlittSignature, type FlittParams } from '@/lib/payments/flitt-signature';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Flitt server callback — the authoritative source of payment truth.
 *
 * Flitt POSTs a flat JSON body (NOT wrapped in `response`) and expects HTTP 200,
 * otherwise it retries (2s, 60s, 5m, 10m, 1h, 24h). We:
 *   1. verify the SHA1 signature with FLITT_PAYMENT_KEY,
 *   2. map `order_status` → our paymentStatus/status,
 *   3. process idempotently by order_id (a retried approved callback is a no-op),
 *   4. return 200 only after the state is persisted.
 *
 * `response_status` is the API processing status, NOT the payment result.
 * The payment outcome is `order_status` (approved/declined/processing/...).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.FLITT_PAYMENT_KEY;
  if (!secret) {
    console.warn('[payments/webhook] FLITT_PAYMENT_KEY not set; rejecting');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Flitt may send the flat payload directly or (rarely) under `response`.
  const payload = (
    typeof body.response === 'object' && body.response !== null ? body.response : body
  ) as Record<string, unknown>;

  const received = typeof payload.signature === 'string' ? payload.signature : undefined;
  if (!verifyFlittSignature(secret, payload as FlittParams, received)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const orderId = typeof payload.order_id === 'string' ? payload.order_id : undefined;
  const orderStatus = typeof payload.order_status === 'string' ? payload.order_status : undefined;
  if (!orderId || !orderStatus) {
    return NextResponse.json({ error: 'Missing order_id or order_status' }, { status: 400 });
  }

  try {
    await connectDB();
    const order = await Order.findById(orderId);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    switch (orderStatus) {
      case 'approved':
        // Idempotent: a retried approved callback for a PAID order is a no-op.
        if (order.paymentStatus !== 'PAID') {
          order.paymentStatus = 'PAID';
          if (order.status === 'PENDING') order.status = 'CONFIRMED';
          await order.save();
        }
        break;
      case 'declined':
      case 'expired':
        if (order.paymentStatus === 'PENDING') {
          order.paymentStatus = 'FAILED';
          await order.save();
        }
        break;
      case 'reversed':
        if (order.paymentStatus !== 'REFUNDED') {
          order.paymentStatus = 'REFUNDED';
          await order.save();
        }
        break;
      // `created` / `processing` — intermediate, no state change.
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[payments/webhook]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
