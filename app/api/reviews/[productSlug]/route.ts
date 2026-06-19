import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Review from '@/models/Review';

type Params = { params: { productSlug: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const productSlug = params.productSlug;
    const reviews = await Review.find({ productSlug, isApproved: true })
      .sort('-createdAt')
      .select('userName rating title body isVerifiedPurchase createdAt')
      .lean();

    const count = reviews.length;
    const averageRating =
      count > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
        : 0;

    return NextResponse.json({ reviews, averageRating, count });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
