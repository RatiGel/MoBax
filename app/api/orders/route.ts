import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Setting, { SETTING_KEYS } from '@/models/Setting';
import { CreateOrderSchema } from '@/lib/validations';
import { auth } from '@/auth';
import { initiatePayment } from '@/lib/payments';
import { getDeliveryFee, getRegionForCity, isMethodValid } from '@/lib/shipping';
import { sendEmail } from '@/lib/email/send';
import OrderConfirmation from '@/lib/email/templates/OrderConfirmation';
import AdminNewOrder from '@/lib/email/templates/AdminNewOrder';

/**
 * Resolve the admin notification recipient: ADMIN_EMAIL env first, then the
 * NOTIFICATIONS setting's adminEmail. Returns null if neither is set.
 */
async function resolveAdminEmail(): Promise<string | null> {
  if (process.env.ADMIN_EMAIL) return process.env.ADMIN_EMAIL;
  try {
    const setting = await Setting.findOne({ key: SETTING_KEYS.NOTIFICATIONS }).lean();
    const value = setting?.value as { adminEmail?: string } | undefined;
    return value?.adminEmail || null;
  } catch {
    return null;
  }
}

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
    const { items, address, guestEmail, paymentMethod, deliveryMethod } = parsed.data;

    // Re-derive region from the chosen city and re-validate the method server-side:
    // pickup is always allowed; instant/nextday require a Tbilisi address; regional
    // requires a non-Tbilisi one; instant also requires the 08:00–18:00 (non-Sunday)
    // window. Never trust the client's claimed fee.
    const region = getRegionForCity(address.city);
    if (!isMethodValid(deliveryMethod, region, new Date())) {
      return NextResponse.json(
        { error: 'Selected delivery method is not available for this address.' },
        { status: 400 }
      );
    }

    const productIds = items.map((i) => i.productId);
    const dbProducts = await Product.find({ _id: { $in: productIds }, isActive: true });

    if (dbProducts.length !== items.length) {
      return NextResponse.json({ error: 'One or more products not found' }, { status: 400 });
    }

    // Validate requested quantities against live stock before reserving any.
    for (const item of items) {
      const product = dbProducts.find((p) => p._id.toString() === item.productId)!;
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for "${product.nameEn}" (${product.stock} left)` },
          { status: 409 }
        );
      }
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
    // Shipping fee is courier-collected (paid in cash on delivery), so it is
    // recorded on the order but NOT included in the online gateway charge below.
    const shippingCost = getDeliveryFee(deliveryMethod, address.city);
    const total = subtotal + shippingCost;

    // Reserve stock with guarded atomic decrements (stock >= qty), so two
    // concurrent orders can't oversell. Roll back if any decrement loses the race.
    const decremented: { id: string; qty: number }[] = [];
    for (const item of items) {
      const res = await Product.updateOne(
        { _id: item.productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
      if (res.modifiedCount !== 1) {
        // Race lost — restore what we already took and abort.
        await Promise.all(
          decremented.map((d) =>
            Product.updateOne({ _id: d.id }, { $inc: { stock: d.qty } })
          )
        );
        return NextResponse.json(
          { error: 'Stock changed while placing your order. Please try again.' },
          { status: 409 }
        );
      }
      decremented.push({ id: item.productId, qty: item.quantity });
    }

    let order;
    try {
      order = await Order.create({
        userId: session?.user?.id,
        guestEmail: !session?.user ? guestEmail || address.email : undefined,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod,
        subtotal,
        shippingCost,
        deliveryMethod,
        total,
        addressSnapshot: address,
        items: orderItems,
      });
    } catch (createErr) {
      // Order write failed after reserving stock — release the reservation.
      await Promise.all(
        decremented.map((d) => Product.updateOne({ _id: d.id }, { $inc: { stock: d.qty } }))
      );
      throw createErr;
    }

    // Initiate Flitt hosted checkout. Returns a redirect URL for the buyer.
    let payment: Awaited<ReturnType<typeof initiatePayment>> = {};
    {
      const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
      try {
        payment = await initiatePayment({
          method: paymentMethod,
          orderId: String(order._id),
          orderNumber: order.orderNumber,
          // Online charge = products only; the delivery fee is paid to the courier.
          amount: subtotal,
          successUrl: `${origin}/api/payments/success?orderId=${order._id}`,
          failUrl: `${origin}/api/payments/fail?orderId=${order._id}`,
        });
      } catch (payErr) {
        // Gateway not configured / failed: keep the order PENDING so admin can
        // follow up, but tell the client the gateway is unavailable.
        console.warn('[orders] payment initiate failed', payErr);
        return NextResponse.json(
          {
            order,
            paymentError:
              payErr instanceof Error ? payErr.message : 'Payment could not be started',
          },
          { status: 201 }
        );
      }
    }

    // Fire-and-forget notifications. Never block or fail the order response.
    const customerEmail = session?.user?.email || order.guestEmail || address.email;
    const customerName = address.firstName || session?.user?.name || 'there';

    if (customerEmail) {
      void sendEmail({
        to: customerEmail,
        subject: `Order ${order.orderNumber} confirmed`,
        react: OrderConfirmation({
          orderNumber: order.orderNumber,
          customerName,
          items: orderItems,
          subtotal,
          shippingCost,
          total,
        }),
      });
    }

    void resolveAdminEmail().then((adminEmail) => {
      if (!adminEmail) return;
      return sendEmail({
        to: adminEmail,
        subject: `New order ${order.orderNumber}`,
        react: AdminNewOrder({
          orderNumber: order.orderNumber,
          total,
          customerEmail: customerEmail || 'unknown',
        }),
      });
    });

    return NextResponse.json({ order, payment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
