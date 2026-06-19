import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';

export const dynamic = 'force-dynamic';

/**
 * Bank/Stripe redirect target on successful payment. In a real integration the
 * provider also calls the webhook (authoritative). This handler optimistically
 * marks the order PAID/CONFIRMED and bounces the user to the confirmation page.
 */
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId');
  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

  if (orderId) {
    try {
      await connectDB();
      await Order.updateOne(
        { _id: orderId, paymentStatus: { $ne: 'PAID' } },
        { $set: { paymentStatus: 'PAID', status: 'CONFIRMED' } }
      );
    } catch (err) {
      console.error('[payments/success]', err);
    }
  }

  const target = orderId
    ? `${origin}/en/orders/${orderId}?paid=1`
    : `${origin}/en`;
  return NextResponse.redirect(target);
}
