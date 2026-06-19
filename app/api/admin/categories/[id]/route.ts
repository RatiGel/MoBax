import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail, notFound } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { UpdateCategorySchema } from '@/lib/validations';
import Category from '@/models/Category';
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
    if (!isValidId(params.id)) return notFound('Category not found');

    const category = await Category.findById(params.id).lean();
    if (!category) return notFound('Category not found');
    return ok(category);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/categories/:id GET]', err);
    return fail('Failed to load category', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'categories' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Category not found');

    const json = await req.json();
    const parsed = UpdateCategorySchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid category data', 422);
    }
    const data = parsed.data;

    // Guard uniqueness only against OTHER documents.
    if (data.slug) {
      const taken = await Category.exists({ slug: data.slug, _id: { $ne: params.id } });
      if (taken) return fail('A category with this slug already exists', 409);
    }

    const category = await Category.findByIdAndUpdate(
      params.id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
    if (!category) return notFound('Category not found');

    await logActivity(session, 'category.update', 'Category', params.id, {
      fields: Object.keys(data),
    });

    return ok(category);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/categories/:id PATCH]', err);
    return fail('Failed to update category', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'categories' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Category not found');

    const category = await Category.findById(params.id).lean();
    if (!category) return notFound('Category not found');

    // Block deletion while products still reference this category.
    const inUse = await Product.exists({ categorySlug: category.slug });
    if (inUse) {
      return fail(
        'Cannot delete: products are still assigned to this category. Reassign them first.',
        409
      );
    }

    await Category.findByIdAndDelete(params.id);
    await logActivity(session, 'category.delete', 'Category', params.id, {
      slug: category.slug,
    });

    return ok({ id: params.id, deleted: true });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/categories/:id DELETE]', err);
    return fail('Failed to delete category', 500);
  }
}
