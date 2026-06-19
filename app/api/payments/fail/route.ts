import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';

export const dynamic = 'force-dynamic';

/** Bank/Stripe redirect target on failed/cancelled payment. */
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId');
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
  return NextResponse.redirect(target);
}
