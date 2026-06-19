import Review from '@/models/Review';
import Product from '@/models/Product';

/**
 * Recompute a product's `rating` + `reviewCount` from APPROVED reviews only,
 * so unapproved/rejected reviews never affect what shoppers see. Call after
 * any change to a review's approval state (create/approve/reject/delete).
 * Rating is rounded to one decimal. No-ops silently if the product is gone.
 */
export async function recomputeProductRating(productSlug: string): Promise<void> {
  const [agg] = await Review.aggregate<{ avg: number; count: number }>([
    { $match: { productSlug, isApproved: true } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const count = agg?.count ?? 0;
  const rating = count > 0 ? Math.round((agg!.avg) * 10) / 10 : 0;

  await Product.updateOne(
    { slug: productSlug },
    { $set: { rating, reviewCount: count } }
  );
}
