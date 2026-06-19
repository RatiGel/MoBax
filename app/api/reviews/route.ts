import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import { ReviewSchema } from '@/lib/validations';
import { recomputeProductRating } from '@/lib/reviews';
import Review from '@/models/Review';
import Product from '@/models/Product';
import Order from '@/models/Order';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be signed in to review' }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = ReviewSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid review' },
        { status: 422 }
      );
    }
    const { productSlug, rating, title, body } = parsed.data;

    await connectDB();

    const product = await Product.findOne({ slug: productSlug, isActive: true }).select('_id').lean();
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const userId = session.user.id;

    // One review per user per product.
    const existing = await Review.exists({ productSlug, userId });
    if (existing) {
      return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 409 });
    }

    // Verified purchase: a DELIVERED order by this user containing this product.
    // Order items store the product _id in `productId` (see app/api/orders/route.ts).
    const purchase = await Order.exists({
      userId,
      status: 'DELIVERED',
      'items.productId': String(product._id),
    });

    const userName =
      session.user.name?.trim() || session.user.email?.split('@')[0] || 'Customer';

    const review = await Review.create({
      productSlug,
      userId,
      userName,
      rating,
      title,
      body,
      isApproved: false,
      isVerifiedPurchase: !!purchase,
    });

    // Recompute from approved reviews only — a new pending review must not move the rating.
    await recomputeProductRating(productSlug);

    return NextResponse.json({ review: review.toObject() }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
