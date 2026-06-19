import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail, notFound } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { UpdateBrandSchema } from '@/lib/validations';
import Brand from '@/models/Brand';
import Product from '@/models/Product';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin({ module: 'categories' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Brand not found');

    const brand = await Brand.findById(params.id).lean();
    if (!brand) return notFound('Brand not found');
    return ok(brand);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/brands/:id GET]', err);
    return fail('Failed to load brand', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'categories' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Brand not found');

    const json = await req.json();
    const parsed = UpdateBrandSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid brand data', 422);
    }
    const data = parsed.data;
    if (data.name) data.name = data.name.trim();

    // Guard uniqueness only against OTHER documents.
    if (data.name) {
      const taken = await Brand.exists({ name: data.name, _id: { $ne: params.id } });
      if (taken) return fail('A brand with this name already exists', 409);
    }

    const brand = await Brand.findByIdAndUpdate(
      params.id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
    if (!brand) return notFound('Brand not found');

    await logActivity(session, 'brand.update', 'Brand', params.id, {
      fields: Object.keys(data),
    });

    return ok(brand);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/brands/:id PATCH]', err);
    return fail('Failed to update brand', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'categories' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Brand not found');

    const brand = await Brand.findById(params.id).lean();
    if (!brand) return notFound('Brand not found');

    // Block deletion while products still reference this brand.
    const inUse = await Product.exists({ brand: brand.name });
    if (inUse) {
      return fail(
        'Cannot delete: products are still assigned to this brand. Reassign them first.',
        409
      );
    }

    await Brand.findByIdAndDelete(params.id);
    await logActivity(session, 'brand.delete', 'Brand', params.id, { name: brand.name });

    return ok({ id: params.id, deleted: true });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/brands/:id DELETE]', err);
    return fail('Failed to delete brand', 500);
  }
}
