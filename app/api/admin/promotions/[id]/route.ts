import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail, notFound } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { UpdatePromotionSchema } from '@/lib/validations';
import Promotion from '@/models/Promotion';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin({ module: 'pricing' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Promotion not found');

    const promotion = await Promotion.findById(params.id).lean();
    if (!promotion) return notFound('Promotion not found');
    return ok(promotion);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/promotions/:id GET]', err);
    return fail('Failed to load promotion', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'pricing' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Promotion not found');

    const json = await req.json();
    const parsed = UpdatePromotionSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid promotion data', 422);
    }
    const data = parsed.data;

    const promotion = await Promotion.findByIdAndUpdate(
      params.id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
    if (!promotion) return notFound('Promotion not found');

    await logActivity(session, 'promotion.update', 'Promotion', params.id, {
      fields: Object.keys(data),
    });

    return ok(promotion);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/promotions/:id PATCH]', err);
    return fail('Failed to update promotion', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'pricing' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Promotion not found');

    const deleted = await Promotion.findByIdAndDelete(params.id).lean();
    if (!deleted) return notFound('Promotion not found');

    await logActivity(session, 'promotion.delete', 'Promotion', params.id);
    return ok({ id: params.id, deleted: true });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/promotions/:id DELETE]', err);
    return fail('Failed to delete promotion', 500);
  }
}
