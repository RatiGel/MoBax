import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';

export const dynamic = 'force-dynamic';

/**
 * Payment provider's browser return target on failed/cancelled payment. Flitt
 * returns via POST with the transaction fields; our own `?orderId=` is on the
 * query string — accept both methods and read the id from either place.
 */
async function resolveOrderId(req: NextRequest): Promise<string | null> {
  const fromQuery = req.nextUrl.searchParams.get('orderId') || req.nextUrl.searchParams.get('order_id');
  if (fromQuery) return fromQuery;
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

  if (orderId) {
    try {
      await connectDB();
      await Order.updateOne(
        { _id: orderId, paymentStatus: 'PENDING' },
        { $set: { paymentStatus: 'FAILED' } }
      );
    } catch (err) {
      console.error('[payments/fail]', err);
    }
  }

  const target = orderId
    ? `${origin}/en/orders/${orderId}?payment=failed`
    : `${origin}/en/cart`;
  // 303 so a POST return becomes a GET on the target page.
  return NextResponse.redirect(target, 303);
}

export const GET = handle;
export const POST = handle;
