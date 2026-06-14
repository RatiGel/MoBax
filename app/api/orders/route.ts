import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { CreateOrderSchema } from '@/lib/validations';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateOrderSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message ?? 'Validation error' },
        { status: 400 }
      );
    }

    await connectDB();

    const session = await auth();
    const { items, address, guestEmail } = parsed.data;

    const productIds = items.map((i) => i.productId);
    const dbProducts = await Product.find({ _id: { $in: productIds }, isActive: true });

    if (dbProducts.length !== items.length) {
      return NextResponse.json({ error: 'One or more products not found' }, { status: 400 });
    }

    const orderItems = items.map((item) => {
      const product = dbProducts.find((p) => p._id.toString() === item.productId)!;
      return {
        productId: item.productId,
        nameSnapshot: `${product.nameEn}`,
        priceSnapshot: product.price,
        quantity: item.quantity,
        image: product.images[0] || '',
      };
    });

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.priceSnapshot * item.quantity,
      0
    );
    const shippingCost = subtotal >= 50 ? 0 : 5;
    const total = subtotal + shippingCost;

    const order = await Order.create({
      userId: session?.user?.id,
      guestEmail: !session?.user ? guestEmail || address.email : undefined,
      status: 'PENDING',
      subtotal,
      shippingCost,
      total,
      addressSnapshot: address,
      items: orderItems,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
