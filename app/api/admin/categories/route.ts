import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { revalidateStorefront } from '@/lib/revalidate';
import { CreateCategorySchema } from '@/lib/validations';
import { slugify } from '@/lib/utils';
import { getCategoryProductCounts } from '@/lib/catalog';
import Category from '@/models/Category';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin({ module: 'categories' });
    await connectDB();

    const search = req.nextUrl.searchParams.get('search')?.trim();

    const filter: Record<string, unknown> = {};
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ nameEn: rx }, { nameKa: rx }, { slug: rx }];
    }

    const categories = await Category.find(filter).sort('nameEn').lean();

    // Counts are computed live rather than stored: a denormalised
    // productCount has to be kept in sync across every product create,
    // update, delete, bulk-sale and stock adjustment, and the stored one
    // drifted so far it claimed 284 products against a catalog of 23.
    // A parent's count is the sum of its children's, since products carry
    // a leaf categorySlug.
    const counts = await getCategoryProductCounts();
    const withCounts = categories.map((c) => ({ ...c, productCount: counts[c.slug] ?? 0 }));

    return ok({ categories: withCounts, total: withCounts.length });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/categories GET]', err);
    return fail('Failed to load categories', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin({ module: 'categories' });
    await connectDB();

    const json = await req.json();
    const parsed = CreateCategorySchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid category data', 422);
    }
    const data = parsed.data;
    const slug = (data.slug && data.slug.trim()) || slugify(data.nameEn);

    const slugTaken = await Category.exists({ slug });
    if (slugTaken) return fail('A category with this slug already exists', 409);

    const category = await Category.create({
      ...data,
      slug,
      parentSlug: data.parentSlug ?? null,
    });

    await logActivity(session, 'category.create', 'Category', String(category._id), {
      slug,
      nameEn: category.nameEn,
    });

    revalidateStorefront('category');

    return ok(category.toObject(), 201);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/categories POST]', err);
    return fail('Failed to create category', 500);
  }
}
