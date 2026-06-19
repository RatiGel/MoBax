import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { auth } from '@/auth';
import Order from '@/models/Order';

export const dynamic = 'force-dynamic';

/**
 * Public order lookup (owner, admin, or guest-with-email).
 *   - Authed owner: userId matches session.
 *   - Admin: any order.
 *   - Guest: must pass ?email= matching the order's guestEmail (or address email).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    await connectDB();
    const order = await Order.findById(params.id).lean();
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const session = await auth();
    const role = session?.user?.role;
    const isAdmin = role && role !== 'CUSTOMER';
    const isOwner = session?.user?.id && order.userId && session.user.id === order.userId;

    if (!isAdmin && !isOwner) {
      // Guest path: require matching email.
      const email = req.nextUrl.searchParams.get('email')?.toLowerCase().trim();
      const orderEmail = (order.guestEmail || '').toLowerCase();
      if (!email || email !== orderEmail) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ order });
  } catch (err) {
    console.error('[orders/:id GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
