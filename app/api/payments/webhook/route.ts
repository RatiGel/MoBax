import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generic bank/Stripe payment webhook. The authoritative source of payment truth.
 *
 * Verifies an HMAC-SHA256 signature over the raw body using PAYMENT_WEBHOOK_SECRET
 * (replace with the provider's exact signature scheme when integrating). Idempotent:
 * a retried webhook for an already-PAID order is a no-op.
 *
 * Expected JSON body: { orderId, status: 'PAID'|'FAILED'|'REFUNDED' }
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  const raw = await req.text();

  if (secret) {
    const sig = req.headers.get('x-signature') || '';
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    // No secret configured → refuse, so a misconfigured prod can't be spoofed.
    console.warn('[payments/webhook] PAYMENT_WEBHOOK_SECRET not set; rejecting');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  let payload: { orderId?: string; status?: string };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { orderId, status } = payload;
  if (!orderId || !status) {
    return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
  }

  try {
    await connectDB();
    const order = await Order.findById(orderId);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Idempotency: ignore if already in the target paid/refunded state.
    if (status === 'PAID' && order.paymentStatus !== 'PAID') {
      order.paymentStatus = 'PAID';
      if (order.status === 'PENDING') order.status = 'CONFIRMED';
      await order.save();
    } else if (status === 'FAILED' && order.paymentStatus === 'PENDING') {
      order.paymentStatus = 'FAILED';
      await order.save();
    } else if (status === 'REFUNDED' && order.paymentStatus !== 'REFUNDED') {
      order.paymentStatus = 'REFUNDED';
      await order.save();
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[payments/webhook]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
