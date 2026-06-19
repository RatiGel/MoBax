import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { CreateDiscountSchema } from '@/lib/validations';
import Discount from '@/models/Discount';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin({ module: 'pricing' });
    await connectDB();

    const discounts = await Discount.find().sort('-createdAt').lean();
    return ok({ discounts, total: discounts.length });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/discounts GET]', err);
    return fail('Failed to load discount codes', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin({ module: 'pricing' });
    await connectDB();

    const json = await req.json();
    const parsed = CreateDiscountSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid discount data', 422);
    }
    const data = parsed.data; // code is already uppercased by the schema

    const taken = await Discount.exists({ code: data.code });
    if (taken) return fail('A discount with this code already exists', 409);

    const discount = await Discount.create(data);

    await logActivity(session, 'discount.create', 'Discount', String(discount._id), {
      code: discount.code,
    });

    return ok(discount.toObject(), 201);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/discounts POST]', err);
    return fail('Failed to create discount code', 500);
  }
}
