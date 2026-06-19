import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { CreateBrandSchema } from '@/lib/validations';
import Brand from '@/models/Brand';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin({ module: 'categories' });
    await connectDB();

    const search = req.nextUrl.searchParams.get('search')?.trim();

    const filter: Record<string, unknown> = {};
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.name = rx;
    }

    const brands = await Brand.find(filter).sort('name').lean();

    return ok({ brands, total: brands.length });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/brands GET]', err);
    return fail('Failed to load brands', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin({ module: 'categories' });
    await connectDB();

    const json = await req.json();
    const parsed = CreateBrandSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid brand data', 422);
    }
    const data = parsed.data;
    const name = data.name.trim();

    const nameTaken = await Brand.exists({ name });
    if (nameTaken) return fail('A brand with this name already exists', 409);

    const brand = await Brand.create({ ...data, name });

    await logActivity(session, 'brand.create', 'Brand', String(brand._id), {
      name: brand.name,
    });

    return ok(brand.toObject(), 201);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/brands POST]', err);
    return fail('Failed to create brand', 500);
  }
}
