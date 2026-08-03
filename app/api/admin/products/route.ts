import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { revalidateStorefront } from '@/lib/revalidate';
import { activeSaleQuery } from '@/lib/catalog';
import { CreateProductSchema } from '@/lib/validations';
import { slugify } from '@/lib/utils';
import Product from '@/models/Product';

export const dynamic = 'force-dynamic';

const SORT_MAP: Record<string, string> = {
  newest: '-createdAt',
  oldest: 'createdAt',
  nameEn: 'nameEn',
  price: 'price',
  stock: 'stock',
};

export async function GET(req: NextRequest) {
  try {
    await requireAdmin({ module: 'products' });
    await connectDB();

    const { searchParams } = req.nextUrl;
    const search = searchParams.get('search')?.trim();
    const category = searchParams.get('category');
    const status = searchParams.get('status'); // active | inactive | all
    const sortKey = searchParams.get('sort') || 'newest';
    const dir = searchParams.get('dir') === 'asc' ? '' : '-';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));

    const filter: Record<string, unknown> = {};
    if (category) filter.categorySlug = category;
    if (status === 'active') filter.isActive = true;
    else if (status === 'inactive') filter.isActive = false;
    // Same predicate the storefront uses (lib/catalog.ts) so "On sale" here
    // always matches what actually shows on /products/discounts.
    if (searchParams.get('onSale') === 'true') Object.assign(filter, activeSaleQuery());
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ nameEn: rx }, { nameKa: rx }, { sku: rx }, { brand: rx }];
    }

    // Build sort. If a column sort key is given use dir; named presets keep their sign.
    const base = SORT_MAP[sortKey] ?? SORT_MAP.newest;
    const sortObj =
      sortKey in SORT_MAP && !base.startsWith('-')
        ? `${dir}${base}`
        : base;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return ok({ products, total, page, limit });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/products GET]', err);
    return fail('Failed to load products', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin({ module: 'products' });
    await connectDB();

    const json = await req.json();
    const parsed = CreateProductSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid product data', 422);
    }
    const data = parsed.data;
    const slug = (data.slug && data.slug.trim()) || slugify(data.nameEn);

    const [slugTaken, skuTaken] = await Promise.all([
      Product.exists({ slug }),
      Product.exists({ sku: data.sku }),
    ]);
    if (slugTaken) return fail('A product with this slug already exists', 409);
    if (skuTaken) return fail('A product with this SKU already exists', 409);

    const product = await Product.create({ ...data, slug });

    await logActivity(session, 'product.create', 'Product', String(product._id), {
      slug,
      nameEn: product.nameEn,
    });

    revalidateStorefront('product', product.slug);

    return ok(product.toObject(), 201);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/products POST]', err);
    return fail('Failed to create product', 500);
  }
}

/**
 * Bulk sale pricing for the Discounts feature.
 * `setSale`  — { ids, action: 'setSale', mode: 'percent' | 'fixed', value, startsAt?, endsAt? }
 * `clearSale`— { ids, action: 'clearSale' }
 */
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin({ module: 'products' });
    await connectDB();
    const body = await req.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0) return fail('No products selected', 400);

    if (body.action === 'clearSale') {
      const res = await Product.updateMany(
        { _id: { $in: ids } },
        { $unset: { salePrice: '', salePriceStart: '', salePriceEnd: '' } },
      );
      revalidateStorefront('product');
      return ok({ updated: res.modifiedCount });
    }

    if (body.action === 'setSale') {
      const value = Number(body.value);
      if (!Number.isFinite(value) || value <= 0) return fail('Invalid sale value', 400);
      if (body.mode === 'percent' && value >= 100) return fail('Percent must be below 100', 400);

      // Validate dates before the loop: an already-invalid Date passed to
      // Mongoose's date caster throws a CastError mid-batch, which would
      // abort with a bare 500 after only partially applying the update and
      // give the caller no accounting of what happened. Fail fast instead.
      const start = body.startsAt ? new Date(body.startsAt) : null;
      if (start && Number.isNaN(start.getTime())) return fail('Invalid start date', 400);
      const end = body.endsAt ? new Date(body.endsAt) : null;
      if (end && Number.isNaN(end.getTime())) return fail('Invalid end date', 400);
      // An end at or before start can never satisfy isOnSale() — the same
      // silent-no-op the salePrice >= price guard below already prevents.
      if (start && end && end <= start) {
        return fail('End date must be after start date', 400);
      }

      const products = await Product.find({ _id: { $in: ids } }).lean();
      let updated = 0;
      for (const p of products) {
        const salePrice =
          body.mode === 'percent'
            ? Math.round(p.price * (1 - value / 100) * 100) / 100
            : value;
        // A sale that doesn't undercut the price would never satisfy isOnSale(),
        // so reject it here rather than writing a row that silently never shows.
        if (salePrice >= p.price) continue;
        await Product.updateOne(
          { _id: p._id },
          {
            $set: {
              salePrice,
              salePriceStart: start,
              salePriceEnd: end,
            },
          },
        );
        updated += 1;
      }
      revalidateStorefront('product');
      return ok({ updated, skipped: ids.length - updated });
    }

    return fail('Unknown action', 400);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/products PATCH]', err);
    return fail('Failed to update products', 500);
  }
}
