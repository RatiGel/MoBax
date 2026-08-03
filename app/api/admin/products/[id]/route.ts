import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail, notFound } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { revalidateStorefront } from '@/lib/revalidate';
import { UpdateProductSchema } from '@/lib/validations';
import Product from '@/models/Product';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

// Product._id is a String (models/Product.ts), not an ObjectId — seeded
// products keep stable catalog ids like "1"-"23". Only reject ids that
// can't possibly be a real document id: empty/whitespace, or absurdly long.
function isValidId(id: string) {
  return typeof id === 'string' && id.trim().length > 0 && id.length <= 200;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin({ module: 'products' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Product not found');

    const product = await Product.findById(params.id).lean();
    if (!product) return notFound('Product not found');
    return ok(product);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/products/:id GET]', err);
    return fail('Failed to load product', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'products' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Product not found');

    const json = await req.json();
    const parsed = UpdateProductSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid product data', 422);
    }
    const data = parsed.data;

    // Guard uniqueness only against OTHER documents.
    if (data.slug) {
      const taken = await Product.exists({ slug: data.slug, _id: { $ne: params.id } });
      if (taken) return fail('A product with this slug already exists', 409);
    }
    if (data.sku) {
      const taken = await Product.exists({ sku: data.sku, _id: { $ne: params.id } });
      if (taken) return fail('A product with this SKU already exists', 409);
    }

    const product = await Product.findByIdAndUpdate(
      params.id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
    if (!product) return notFound('Product not found');

    await logActivity(session, 'product.update', 'Product', params.id, {
      fields: Object.keys(data),
    });

    revalidateStorefront('product', product.slug);

    return ok(product);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/products/:id PATCH]', err);
    return fail('Failed to update product', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'products' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Product not found');

    // Hard delete only when ?hard=true; default is soft-delete (isActive=false).
    const hard = req.nextUrl.searchParams.get('hard') === 'true';

    if (hard) {
      const deleted = await Product.findByIdAndDelete(params.id).lean();
      if (!deleted) return notFound('Product not found');
      await logActivity(session, 'product.delete', 'Product', params.id, { hard: true });
      revalidateStorefront('product', deleted.slug);
      return ok({ id: params.id, deleted: true });
    }

    const product = await Product.findByIdAndUpdate(
      params.id,
      { $set: { isActive: false } },
      { new: true }
    ).lean();
    if (!product) return notFound('Product not found');
    await logActivity(session, 'product.archive', 'Product', params.id);
    revalidateStorefront('product', product.slug);
    return ok(product);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/products/:id DELETE]', err);
    return fail('Failed to delete product', 500);
  }
}
