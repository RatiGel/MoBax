import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { CreateCatalogProductSchema } from '@/lib/validations';
import CatalogProduct from '@/models/CatalogProduct';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin({ module: 'content' });
    await connectDB();
    const products = await CatalogProduct.find().sort({ order: 1, createdAt: 1 }).lean();
    return ok({ products });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/catalog GET]', err);
    return fail('Failed to load catalog products', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin({ module: 'content' });
    await connectDB();
    const json = await req.json();
    const parsed = CreateCatalogProductSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid catalog product data', 422);
    }
    const created = await CatalogProduct.create(parsed.data);
    await logActivity(session, 'catalog.create', 'CatalogProduct', String(created._id), {
      nameEn: created.nameEn,
    });
    return ok(created.toObject(), 201);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/catalog POST]', err);
    return fail('Failed to create catalog product', 500);
  }
}
