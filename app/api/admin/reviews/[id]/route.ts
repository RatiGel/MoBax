import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail, notFound } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { recomputeProductRating } from '@/lib/reviews';
import Review from '@/models/Review';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

const PatchSchema = z.object({ isApproved: z.boolean() });

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'products' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Review not found');

    const json = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid request', 422);
    }

    const review = await Review.findByIdAndUpdate(
      params.id,
      { $set: { isApproved: parsed.data.isApproved } },
      { new: true }
    ).lean();
    if (!review) return notFound('Review not found');

    // Approval state changed → displayed rating must reflect approved reviews only.
    await recomputeProductRating(review.productSlug);

    await logActivity(
      session,
      parsed.data.isApproved ? 'review.approve' : 'review.reject',
      'Review',
      params.id,
      { productSlug: review.productSlug }
    );

    return ok(review);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/reviews/:id PATCH]', err);
    return fail('Failed to update review', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'products' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Review not found');

    const review = await Review.findByIdAndDelete(params.id).lean();
    if (!review) return notFound('Review not found');

    await recomputeProductRating(review.productSlug);

    await logActivity(session, 'review.delete', 'Review', params.id, {
      productSlug: review.productSlug,
    });

    return ok({ id: params.id, deleted: true });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/reviews/:id DELETE]', err);
    return fail('Failed to delete review', 500);
  }
}
