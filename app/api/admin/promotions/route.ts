import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { CreatePromotionSchema } from '@/lib/validations';
import Promotion from '@/models/Promotion';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin({ module: 'pricing' });
    await connectDB();

    const promotions = await Promotion.find().sort('-createdAt').lean();
    return ok({ promotions, total: promotions.length });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/promotions GET]', err);
    return fail('Failed to load promotions', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin({ module: 'pricing' });
    await connectDB();

    const json = await req.json();
    const parsed = CreatePromotionSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid promotion data', 422);
    }

    const promotion = await Promotion.create(parsed.data);

    await logActivity(session, 'promotion.create', 'Promotion', String(promotion._id), {
      name: promotion.name,
    });

    return ok(promotion.toObject(), 201);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/promotions POST]', err);
    return fail('Failed to create promotion', 500);
  }
}
