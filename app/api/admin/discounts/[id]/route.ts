import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail, notFound } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { UpdateDiscountSchema } from '@/lib/validations';
import Discount from '@/models/Discount';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin({ module: 'pricing' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Discount not found');

    const discount = await Discount.findById(params.id).lean();
    if (!discount) return notFound('Discount not found');
    return ok(discount);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/discounts/:id GET]', err);
    return fail('Failed to load discount code', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'pricing' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Discount not found');

    const json = await req.json();
    const parsed = UpdateDiscountSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid discount data', 422);
    }
    const data = parsed.data; // code (if present) is already uppercased

    // Guard code uniqueness only against OTHER documents.
    if (data.code) {
      const taken = await Discount.exists({ code: data.code, _id: { $ne: params.id } });
      if (taken) return fail('A discount with this code already exists', 409);
    }

    const discount = await Discount.findByIdAndUpdate(
      params.id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
    if (!discount) return notFound('Discount not found');

    await logActivity(session, 'discount.update', 'Discount', params.id, {
      fields: Object.keys(data),
    });

    return ok(discount);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/discounts/:id PATCH]', err);
    return fail('Failed to update discount code', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'pricing' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Discount not found');

    const deleted = await Discount.findByIdAndDelete(params.id).lean();
    if (!deleted) return notFound('Discount not found');

    await logActivity(session, 'discount.delete', 'Discount', params.id);
    return ok({ id: params.id, deleted: true });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/discounts/:id DELETE]', err);
    return fail('Failed to delete discount code', 500);
  }
}
