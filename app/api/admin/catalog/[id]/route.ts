import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail, notFound } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { UpdateCatalogProductSchema } from '@/lib/validations';
import CatalogProduct from '@/models/CatalogProduct';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function update(req: NextRequest, { params }: Params) {
  const session = await requireAdmin({ module: 'content' });
  await connectDB();
  if (!isValidId(params.id)) return notFound('Catalog product not found');
  const json = await req.json();
  const parsed = UpdateCatalogProductSchema.safeParse(json);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid catalog product data', 422);
  }
  const updated = await CatalogProduct.findByIdAndUpdate(
    params.id,
    { $set: parsed.data },
    { new: true, runValidators: true }
  ).lean();
  if (!updated) return notFound('Catalog product not found');
  await logActivity(session, 'catalog.update', 'CatalogProduct', params.id, {
    fields: Object.keys(parsed.data),
  });
  return ok(updated);
}

export async function PUT(req: NextRequest, ctx: Params) {
  try {
    return await update(req, ctx);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/catalog/:id PUT]', err);
    return fail('Failed to update catalog product', 500);
  }
}

export async function PATCH(req: NextRequest, ctx: Params) {
  try {
    return await update(req, ctx);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/catalog/:id PATCH]', err);
    return fail('Failed to update catalog product', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'content' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Catalog product not found');
    const deleted = await CatalogProduct.findByIdAndDelete(params.id).lean();
    if (!deleted) return notFound('Catalog product not found');
    await logActivity(session, 'catalog.delete', 'CatalogProduct', params.id, {});
    return ok({ id: params.id });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/catalog/:id DELETE]', err);
    return fail('Failed to delete catalog product', 500);
  }
}
