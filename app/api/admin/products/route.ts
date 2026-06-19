import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
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

    return ok(product.toObject(), 201);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/products POST]', err);
    return fail('Failed to create product', 500);
  }
}
