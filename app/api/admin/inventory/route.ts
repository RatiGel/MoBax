import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { revalidateStorefront } from '@/lib/revalidate';
import { InventoryAdjustSchema } from '@/lib/validations';
import Product from '@/models/Product';

export const dynamic = 'force-dynamic';

// Product._id is a String (models/Product.ts), not an ObjectId — seeded
// products keep stable catalog ids like "1"-"23". Only reject ids that
// can't possibly be a real document id: empty/whitespace, or absurdly long.
function isValidId(id: string) {
  return typeof id === 'string' && id.trim().length > 0 && id.length <= 200;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin({ module: 'products' });
    await connectDB();

    const { searchParams } = req.nextUrl;
    const filterParam = searchParams.get('filter') || 'all'; // all | low | out
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));

    const lowQuery = { $expr: { $lte: ['$stock', '$lowStockThreshold'] } };
    const outQuery = { stock: { $lte: 0 } };

    const filter: Record<string, unknown> =
      filterParam === 'low' ? lowQuery : filterParam === 'out' ? outQuery : {};

    const [items, total, lowCount, outCount] = await Promise.all([
      Product.find(filter)
        .select('nameEn nameKa sku images stock lowStockThreshold slug')
        .sort({ stock: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
      Product.countDocuments(lowQuery),
      Product.countDocuments(outQuery),
    ]);

    return ok({
      items: items.map((p) => ({
        id: String(p._id),
        nameEn: p.nameEn,
        nameKa: p.nameKa,
        sku: p.sku,
        image: p.images?.[0] ?? null,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        slug: p.slug,
      })),
      total,
      lowCount,
      outCount,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/inventory GET]', err);
    return fail('Failed to load inventory', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin({ module: 'products' });
    await connectDB();

    const json = await req.json();
    const parsed = InventoryAdjustSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid adjustment', 422);
    }
    const { productId, delta, reason, note } = parsed.data;
    if (!isValidId(productId)) return fail('Product not found', 404);

    // Atomic $inc guarded by a stock floor, rather than findById + save():
    // two concurrent adjustments (e.g. two staff both logging damage) would
    // otherwise both read the same starting stock and the second `save()`
    // would silently clobber the first's write. The guard condition
    // `stock: { $gte: -delta }` is evaluated against whatever the current
    // document looks like at update time, not a stale read, so the negative
    // check and the write are a single atomic operation with no lost update.
    const updated = await Product.findOneAndUpdate(
      { _id: productId, stock: { $gte: -delta } },
      { $inc: { stock: delta } },
      { new: true }
    ).lean();

    if (!updated) {
      // Either the product doesn't exist, or the guard failed (would go negative).
      const exists = await Product.exists({ _id: productId });
      if (!exists) return fail('Product not found', 404);
      return fail('Adjustment would put stock below zero', 400);
    }

    const to = updated.stock;
    const from = to - delta;

    await logActivity(session, 'inventory.adjust', 'Product', String(updated._id), {
      delta,
      reason,
      note: note ?? '',
      from,
      to,
    });

    revalidateStorefront('product', updated.slug);

    return ok({ stock: to });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/inventory POST]', err);
    return fail('Failed to adjust stock', 500);
  }
}
